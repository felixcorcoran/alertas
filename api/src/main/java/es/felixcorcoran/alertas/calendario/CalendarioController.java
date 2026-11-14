package es.felixcorcoran.alertas.calendario;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** GET /api/calendario/{calendario}.ics: el calendario de plazos de alguien (Calendario) */
@RestController
class CalendarioController {

	private static final MediaType ICS = new MediaType("text", "calendar", java.nio.charset.StandardCharsets.UTF_8);

	private final Calendario calendario;

	CalendarioController(Calendario calendario) {
		this.calendario = calendario;
	}

	@GetMapping("/api/calendario/{id:[A-Za-z0-9_-]{43}}.ics")
	ResponseEntity<String> ics(@PathVariable String id) {
		return calendario.de(id)
				.map(ics -> ResponseEntity.ok().contentType(ICS).body(ics))
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "calendario"));
	}
}
