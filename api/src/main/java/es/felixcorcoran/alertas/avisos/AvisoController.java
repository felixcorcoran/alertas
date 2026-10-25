package es.felixcorcoran.alertas.avisos;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import es.felixcorcoran.alertas.Ajustes;

/** Lanza la pasada diaria. Solo con la clave del cron (ALERTAS_CLAVE_AVISOS) */
@RestController
class AvisoController {

	private final AvisoService servicio;
	private final Ajustes ajustes;

	AvisoController(AvisoService servicio, Ajustes ajustes) {
		this.servicio = servicio;
		this.ajustes = ajustes;
	}

	@PostMapping("/api/avisos")
	AvisoService.Resumen procesar(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String autorizacion) {
		String clave = ajustes.claveAvisos();
		if (clave == null || clave.isBlank()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE);
		byte[] esperada = ("Bearer " + clave).getBytes(StandardCharsets.UTF_8);
		byte[] recibida = autorizacion == null ? new byte[0] : autorizacion.getBytes(StandardCharsets.UTF_8);
		if (!MessageDigest.isEqual(esperada, recibida)) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
		return servicio.procesar();
	}
}
