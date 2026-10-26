package es.felixcorcoran.alertas.avisos;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBooleanProperty;
import org.springframework.stereotype.Component;

/**
 * La pasada diaria como proceso que arranca, trabaja y termina: así la
 * ejecuta cada mañana GitHub Actions (.github/workflows/avisos.yml), sin
 * servidor encendido.
 *
 *   java -jar alertas.jar --alertas.pasada=true --spring.main.web-application-type=none
 *
 * Si falla, la excepción tumba el arranque y el proceso sale con error, que
 * la Action marca en rojo.
 */
@Component
@ConditionalOnBooleanProperty("alertas.pasada")
class Pasada implements ApplicationRunner {

	private final AvisoService servicio;

	Pasada(AvisoService servicio) {
		this.servicio = servicio;
	}

	@Override
	public void run(ApplicationArguments args) {
		servicio.procesar();
	}
}
