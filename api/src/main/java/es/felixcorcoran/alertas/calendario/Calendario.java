package es.felixcorcoran.alertas.calendario;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.stereotype.Service;

import es.felixcorcoran.alertas.Ajustes;
import es.felixcorcoran.alertas.avisos.Seguimientos;
import es.felixcorcoran.alertas.convocatorias.Convocatoria;
import es.felixcorcoran.alertas.convocatorias.FuenteConvocatorias;
import es.felixcorcoran.alertas.suscripciones.SuscripcionService;

/**
 * El calendario de plazos de cada persona (.ics): las ayudas que le hemos
 * enviado o va a recibir y las que sigue desde el radar, con fecha de cierre
 * y aún abiertas. Todo el día del cierre, con aviso tres días antes, como el
 * del radar (src/lib/calendario.ts). Lo mismo que web/api/_lib/calendario.mjs.
 */
@Service
public class Calendario {

	private static final ZoneId MADRID = ZoneId.of("Europe/Madrid");
	private static final DateTimeFormatter SELLO = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(ZoneId.of("UTC"));

	private final SuscripcionService suscripciones;
	private final Seguimientos seguimientos;
	private final FuenteConvocatorias fuente;
	private final Ajustes ajustes;
	private final Clock reloj;

	Calendario(SuscripcionService suscripciones, Seguimientos seguimientos, FuenteConvocatorias fuente, Ajustes ajustes, Clock reloj) {
		this.suscripciones = suscripciones;
		this.seguimientos = seguimientos;
		this.fuente = fuente;
		this.ajustes = ajustes;
		this.reloj = reloj;
	}

	/** El .ics de esa dirección de calendario; vacío si no es de nadie */
	public Optional<String> de(String calendario) {
		return suscripciones.porCalendario(calendario).map(s -> {
			Set<String> suyas = new HashSet<>(seguimientos.codigos(s.getId()));
			String hoy = LocalDate.ofInstant(reloj.instant(), MADRID).toString();
			List<Convocatoria> lista = fuente.leer().convocatorias().stream()
					.filter(c -> suyas.contains(c.codigo()) && c.cierre() != null && c.cierre().compareTo(hoy) >= 0)
					.sorted(Comparator.comparing(Convocatoria::cierre))
					.toList();
			return ics(lista, reloj.instant());
		});
	}

	String ics(List<Convocatoria> lista, Instant ahora) {
		List<String> l = new ArrayList<>(List.of("BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//felixcorcoran.es//Avisos del Radar de subvenciones//ES",
				"CALSCALE:GREGORIAN", "X-WR-CALNAME:" + escapar("Tus ayudas · Radar de subvenciones"), "X-WR-TIMEZONE:Europe/Madrid",
				"REFRESH-INTERVAL;VALUE=DURATION:PT12H", "X-PUBLISHED-TTL:PT12H"));
		for (Convocatoria c : lista) {
			String nombre = c.ia() != null && c.ia().titular() != null ? c.ia().titular()
					: c.ia() != null && c.ia().resumen() != null ? c.ia().resumen() : c.titulo();
			String corto = nombre.length() > 90 ? nombre.substring(0, 87).strip() + "…" : nombre;
			String ficha = ajustes.radar() + "/ayudas/" + c.codigo();
			LocalDate fin = LocalDate.parse(c.cierre());
			l.addAll(List.of("BEGIN:VEVENT", "UID:bdns-" + c.codigo() + "@subvenciones.felixcorcoran.es", "DTSTAMP:" + SELLO.format(ahora),
					"DTSTART;VALUE=DATE:" + dia(fin), "DTEND;VALUE=DATE:" + dia(fin.plusDays(1)),
					"SUMMARY:" + escapar("Cierra el plazo: " + corto), "DESCRIPTION:" + escapar(c.titulo() + "\n\nFicha: " + ficha),
					"URL:" + ficha, "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + escapar("Quedan 3 días para pedir: " + corto),
					"TRIGGER:-P3D", "END:VALARM", "END:VEVENT"));
		}
		l.add("END:VCALENDAR");
		return String.join("\r\n", l.stream().map(Calendario::plegar).toList()) + "\r\n";
	}

	private static String dia(LocalDate d) {
		return d.toString().replace("-", "");
	}

	static String escapar(String s) {
		return s.replace("\\", "\\\\").replace("\n", "\\n").replace(",", "\\,").replace(";", "\\;");
	}

	/** Las líneas de un .ics no pasan de 75 octetos: se parten con un espacio delante */
	static String plegar(String linea) {
		if (linea.getBytes(StandardCharsets.UTF_8).length <= 75) return linea;
		StringBuilder todo = new StringBuilder();
		StringBuilder actual = new StringBuilder();
		int limite = 75;
		for (int i = 0; i < linea.length();) {
			int cp = linea.codePointAt(i);
			String ch = new String(Character.toChars(cp));
			if ((actual + ch).getBytes(StandardCharsets.UTF_8).length > limite) {
				todo.append(actual).append("\r\n ");
				actual.setLength(0);
				limite = 74;
			}
			actual.append(ch);
			i += Character.charCount(cp);
		}
		return todo.append(actual).toString();
	}
}
