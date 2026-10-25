package es.felixcorcoran.alertas.suscripciones;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Locale;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import es.felixcorcoran.alertas.Ajustes;
import es.felixcorcoran.alertas.correo.Correo;
import es.felixcorcoran.alertas.correo.Plantillas;
import es.felixcorcoran.alertas.encaje.Catalogo;
import es.felixcorcoran.alertas.encaje.Perfil;

/**
 * Alta con doble confirmación, cambios y baja. La respuesta al apuntarse es
 * siempre la misma, esté o no el email en la base de datos: así no sirve para
 * averiguar quién está apuntado.
 */
@Service
public class SuscripcionService {

	/** Entre dos correos de alta a la misma dirección, para que nadie la inunde */
	static final Duration ENTRE_ALTAS = Duration.ofMinutes(10);
	/** Lo que se guarda una dirección sin confirmar */
	static final Duration SIN_CONFIRMAR = Duration.ofHours(48);

	private static final SecureRandom AZAR = new SecureRandom();

	private final SuscriptorRepository suscriptores;
	private final Catalogo catalogo;
	private final Plantillas plantillas;
	private final Correo correo;
	private final Clock reloj;

	public SuscripcionService(SuscriptorRepository suscriptores, Catalogo catalogo, Plantillas plantillas, Correo correo,
			Clock reloj) {
		this.suscriptores = suscriptores;
		this.catalogo = catalogo;
		this.plantillas = plantillas;
		this.correo = correo;
		this.reloj = reloj;
	}

	@Transactional
	public void apuntar(String email, Perfil perfil) {
		validar(perfil);
		String direccion = email.strip().toLowerCase(Locale.ROOT);
		Instant ahora = reloj.instant();
		Optional<Suscriptor> existente = suscriptores.findByEmail(direccion);

		if (existente.isEmpty()) {
			Suscriptor nuevo = new Suscriptor(direccion, perfil, token(), Ajustes.PRIVACIDAD, ahora);
			nuevo.setUltimoAlta(ahora);
			suscriptores.save(nuevo);
			correo.enviar(plantillas.confirmar(direccion, perfil, nuevo.getToken()));
			return;
		}

		Suscriptor s = existente.get();
		if (s.getUltimoAlta() != null && s.getUltimoAlta().plus(ENTRE_ALTAS).isAfter(ahora)) return;
		s.setUltimoAlta(ahora);
		if (s.getEstado() == Suscriptor.Estado.PENDIENTE) {
			// Aún sin confirmar: vale el último perfil, que es el que se confirmará
			s.setPerfil(perfil);
			s.setConsentimiento(Ajustes.PRIVACIDAD);
			correo.enviar(plantillas.confirmar(direccion, perfil, s.getToken()));
		} else {
			// Ya apuntado: no se cambia nada sin el enlace de su correo
			correo.enviar(plantillas.yaApuntado(direccion, s.getToken()));
		}
	}

	@Transactional
	public Suscriptor confirmar(String token) {
		Suscriptor s = porToken(token);
		s.confirmar(reloj.instant());
		return s;
	}

	@Transactional(readOnly = true)
	public Suscriptor ver(String token) {
		return porToken(token);
	}

	@Transactional
	public Suscriptor cambiar(String token, Perfil perfil) {
		validar(perfil);
		Suscriptor s = porToken(token);
		s.setPerfil(perfil);
		return s;
	}

	/** La baja borra la dirección y sus avisos pendientes: no queda nada */
	@Transactional
	public void borrar(String token) {
		suscriptores.findByToken(token).ifPresent(suscriptores::delete);
	}

	@Transactional
	public long borrarSinConfirmar() {
		return suscriptores.deleteByEstadoAndCreadoBefore(Suscriptor.Estado.PENDIENTE, reloj.instant().minus(SIN_CONFIRMAR));
	}

	private Suscriptor porToken(String token) {
		return suscriptores.findByToken(token)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "enlace"));
	}

	private void validar(Perfil perfil) {
		String error = perfil == null ? "perfil" : perfil.error(catalogo);
		if (error != null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, error);
	}

	/** 256 bits al azar: el enlace de cada persona es su única llave */
	private static String token() {
		byte[] b = new byte[32];
		AZAR.nextBytes(b);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
	}
}
