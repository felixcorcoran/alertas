package es.felixcorcoran.alertas.avisos;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import es.felixcorcoran.alertas.Ajustes;
import es.felixcorcoran.alertas.convocatorias.Convocatoria;
import es.felixcorcoran.alertas.convocatorias.FuenteConvocatorias;
import es.felixcorcoran.alertas.correo.Correo;
import es.felixcorcoran.alertas.correo.Plantillas;
import es.felixcorcoran.alertas.correo.Plantillas.Ayuda;
import es.felixcorcoran.alertas.encaje.Encaje;
import es.felixcorcoran.alertas.encaje.EncajeService;
import es.felixcorcoran.alertas.suscripciones.SuscripcionService;
import es.felixcorcoran.alertas.suscripciones.Suscriptor;
import es.felixcorcoran.alertas.suscripciones.SuscriptorRepository;

/**
 * La pasada diaria (la lanza el cron de GitHub Actions):
 *
 * 1. Borra las altas sin confirmar de hace más de 48 horas.
 * 2. Reparte: cada convocatoria nueva, ya leída por la IA y abierta, se
 *    compara con el negocio de cada persona; si encaja (o hay que revisarla),
 *    queda un aviso pendiente.
 * 3. Envía un correo por persona con sus avisos pendientes, hasta el tope
 *    diario; lo que no quepa sale al día siguiente.
 */
@Service
public class AvisoService {

	private static final Logger log = LoggerFactory.getLogger(AvisoService.class);
	private static final ZoneId MADRID = ZoneId.of("Europe/Madrid");
	/** Ayudas por correo; el resto, en el enlace al radar */
	static final int MAX_AYUDAS_POR_CORREO = 20;

	public record Resumen(long sinConfirmarBorradas, int nuevas, int avisos, int correos, int pendientes) {
	}

	private final FuenteConvocatorias fuente;
	private final EncajeService encajes;
	private final SuscripcionService suscripciones;
	private final SuscriptorRepository suscriptores;
	private final VistaRepository vistas;
	private final AvisoRepository avisos;
	private final Plantillas plantillas;
	private final Correo correo;
	private final Ajustes ajustes;
	private final TransactionTemplate tx;
	private final Clock reloj;

	AvisoService(FuenteConvocatorias fuente, EncajeService encajes, SuscripcionService suscripciones,
			SuscriptorRepository suscriptores, VistaRepository vistas, AvisoRepository avisos, Plantillas plantillas,
			Correo correo, Ajustes ajustes, TransactionTemplate tx, Clock reloj) {
		this.fuente = fuente;
		this.encajes = encajes;
		this.suscripciones = suscripciones;
		this.suscriptores = suscriptores;
		this.vistas = vistas;
		this.avisos = avisos;
		this.plantillas = plantillas;
		this.correo = correo;
		this.ajustes = ajustes;
		this.tx = tx;
		this.reloj = reloj;
	}

	public Resumen procesar() {
		Instant ahora = reloj.instant();
		String hoy = LocalDate.ofInstant(ahora, MADRID).toString();

		long borradas = suscripciones.borrarSinConfirmar();
		List<Convocatoria> convocatorias = fuente.leer().convocatorias();
		int[] reparto = tx.execute(estado -> repartir(convocatorias, hoy, ahora));
		Map<String, Convocatoria> porCodigo = convocatorias.stream()
				.collect(Collectors.toMap(Convocatoria::codigo, Function.identity(), (a, b) -> a));
		int[] envio = enviar(porCodigo, hoy, ahora);

		Resumen r = new Resumen(borradas, reparto[0], reparto[1], envio[0], envio[1]);
		log.info("Pasada de avisos: {}", r);
		return r;
	}

	/** @return [convocatorias nuevas, avisos creados] */
	private int[] repartir(List<Convocatoria> convocatorias, String hoy, Instant ahora) {
		Set<String> yaVistas = new HashSet<>(vistas.findAll().stream().map(ConvocatoriaVista::getCodigo).toList());

		// La primera vez, todo lo que hay ya estaba publicado: no es nuevo para nadie
		if (yaVistas.isEmpty()) {
			vistas.saveAll(convocatorias.stream().map(c -> new ConvocatoriaVista(c.codigo(), ahora)).toList());
			return new int[] { 0, 0 };
		}

		List<Suscriptor> activos = suscriptores.findByEstado(Suscriptor.Estado.ACTIVO);
		int nuevas = 0, creados = 0;
		for (Convocatoria c : convocatorias) {
			// Sin leer aún por la IA: se reparte cuando esté leída
			if (yaVistas.contains(c.codigo()) || c.ia() == null) continue;
			yaVistas.add(c.codigo());
			vistas.save(new ConvocatoriaVista(c.codigo(), ahora));
			boolean abierta = c.cierre() == null || c.cierre().compareTo(hoy) >= 0;
			if (!"ayuda".equals(c.ia().categoria()) || !abierta) continue;
			nuevas++;
			for (Suscriptor s : activos) {
				Encaje e = encajes.encaje(c, s.getPerfil(), hoy);
				if (e.estado() == Encaje.Estado.no) continue;
				avisos.save(new Aviso(s.getId(), c.codigo(), e.estado(), ahora));
				creados++;
			}
		}
		return new int[] { nuevas, creados };
	}

	/** @return [correos enviados, personas que se quedan para mañana] */
	private int[] enviar(Map<String, Convocatoria> porCodigo, String hoy, Instant ahora) {
		Instant inicioDia = LocalDate.parse(hoy).atStartOfDay(MADRID).toInstant();
		long cupo = ajustes.maxCorreosDia() - avisos.correosDesde(inicioDia);

		Map<UUID, List<Aviso>> porPersona = new LinkedHashMap<>();
		for (Aviso a : avisos.findByEnviadoIsNullOrderBySuscriptorIdAscIdAsc()) {
			porPersona.computeIfAbsent(a.getSuscriptorId(), k -> new ArrayList<>()).add(a);
		}

		int enviados = 0, pendientes = 0;
		for (var entrada : porPersona.entrySet()) {
			if (enviados >= cupo) {
				pendientes++;
				continue;
			}
			Suscriptor s = suscriptores.findById(entrada.getKey()).orElse(null);
			if (s == null) continue;

			// Se vuelve a comparar: el negocio o la convocatoria pueden haber cambiado
			List<Ayuda> ayudas = new ArrayList<>();
			for (Aviso a : entrada.getValue()) {
				Convocatoria c = porCodigo.get(a.getCodigo());
				if (c == null) continue;
				Encaje e = encajes.encaje(c, s.getPerfil(), hoy);
				if (e.estado() != Encaje.Estado.no) ayudas.add(new Ayuda(c, e));
			}
			ayudas.sort(Comparator.comparing((Ayuda a) -> a.encaje().estado()));

			try {
				if (!ayudas.isEmpty()) {
					correo.enviar(plantillas.avisos(s.getEmail(), s.getPerfil(), s.getToken(),
							ayudas.subList(0, Math.min(ayudas.size(), MAX_AYUDAS_POR_CORREO))));
					enviados++;
				}
				tx.executeWithoutResult(estado -> {
					List<Aviso> suyos = avisos.findBySuscriptorIdAndEnviadoIsNull(s.getId());
					suyos.forEach(a -> a.setEnviado(ahora));
					suscriptores.findById(s.getId()).ifPresent(x -> x.setUltimoAviso(ahora));
				});
			} catch (RuntimeException e) {
				// Se reintenta en la próxima pasada
				log.warn("No se pudo enviar el correo de avisos a un suscriptor: {}", e.getMessage());
			}
		}
		return new int[] { enviados, pendientes };
	}
}
