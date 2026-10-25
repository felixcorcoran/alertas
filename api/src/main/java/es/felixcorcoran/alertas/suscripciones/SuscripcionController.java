package es.felixcorcoran.alertas.suscripciones;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import es.felixcorcoran.alertas.encaje.Perfil;
import es.felixcorcoran.alertas.web.LimitePorIp;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * La API del panel. El token de cada persona viaja en sus enlaces y es lo
 * único que da acceso a sus datos.
 */
@RestController
@RequestMapping("/api")
public class SuscripcionController {

	public record Alta(
			@NotBlank @Email @Size(max = 254) String email,
			@NotNull Perfil perfil,
			/** Ha marcado «He leído la política de privacidad» */
			@AssertTrue boolean acepto) {

		public Alta {
			// Los espacios de más al copiar y pegar no deberían impedir apuntarse
			if (email != null) email = email.strip();
		}
	}

	public record Vista(String email, Perfil perfil, boolean confirmado) {
		static Vista de(Suscriptor s) {
			return new Vista(s.getEmail(), s.getPerfil(), s.getEstado() == Suscriptor.Estado.ACTIVO);
		}
	}

	public record Token(@NotBlank @Pattern(regexp = TOKEN) String token) {
	}

	private static final String TOKEN = "[A-Za-z0-9_-]{43}";

	private final SuscripcionService servicio;
	private final LimitePorIp limite = new LimitePorIp(5);

	public SuscripcionController(SuscripcionService servicio) {
		this.servicio = servicio;
	}

	@PostMapping("/suscripciones")
	@ResponseStatus(HttpStatus.ACCEPTED)
	public void apuntar(@Valid @RequestBody Alta alta, HttpServletRequest peticion) {
		if (limite.superado(LimitePorIp.ip(peticion))) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS);
		servicio.apuntar(alta.email(), alta.perfil());
	}

	@PostMapping("/suscripciones/confirmar")
	public Vista confirmar(@Valid @RequestBody Token t) {
		return Vista.de(servicio.confirmar(t.token()));
	}

	@GetMapping("/suscripciones/{token:" + TOKEN + "}")
	public Vista ver(@PathVariable String token) {
		return Vista.de(servicio.ver(token));
	}

	@PutMapping("/suscripciones/{token:" + TOKEN + "}")
	public Vista cambiar(@PathVariable String token, @RequestBody Perfil perfil) {
		return Vista.de(servicio.cambiar(token, perfil));
	}

	@DeleteMapping("/suscripciones/{token:" + TOKEN + "}")
	public ResponseEntity<Void> borrar(@PathVariable String token) {
		servicio.borrar(token);
		return ResponseEntity.noContent().build();
	}

	/** Baja con un clic desde el gestor de correo (cabecera List-Unsubscribe-Post, RFC 8058) */
	@PostMapping("/baja/{token:" + TOKEN + "}")
	public ResponseEntity<Void> bajaUnClic(@PathVariable String token) {
		servicio.borrar(token);
		return ResponseEntity.ok().build();
	}
}
