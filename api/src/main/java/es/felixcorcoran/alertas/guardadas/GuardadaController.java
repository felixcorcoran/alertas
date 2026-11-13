package es.felixcorcoran.alertas.guardadas;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import es.felixcorcoran.alertas.web.LimitePorIp;
import jakarta.servlet.http.HttpServletRequest;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * POST /api/guardadas {"codigo":"938128"}: el radar avisa de que alguien ha
 * guardado una ayuda. Llega con navigator.sendBeacon, que manda texto plano
 * (así no hace falta la pregunta previa de CORS): el cuerpo se lee como texto.
 */
@RestController
class GuardadaController {

	private final Guardadas guardadas;
	private final JsonMapper json = JsonMapper.builder().build();
	private final LimitePorIp limite = new LimitePorIp(30);

	GuardadaController(Guardadas guardadas) {
		this.guardadas = guardadas;
	}

	@PostMapping("/api/guardadas")
	ResponseEntity<Void> sumar(@RequestBody(required = false) String cuerpo, HttpServletRequest peticion) {
		if (limite.superado(LimitePorIp.ip(peticion))) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS);
		String codigo;
		try {
			JsonNode nodo = json.readTree(cuerpo == null ? "" : cuerpo);
			codigo = nodo == null || !nodo.has("codigo") ? null : nodo.get("codigo").asString();
		} catch (RuntimeException e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "json");
		}
		if (!Guardadas.valido(codigo)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "codigo");
		guardadas.sumar(codigo);
		return ResponseEntity.noContent().build();
	}
}
