package es.felixcorcoran.alertas.web;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import es.felixcorcoran.alertas.Ajustes;

@Configuration(proxyBeanMethods = false)
class ConfiguracionWeb implements WebMvcConfigurer {

	private final Ajustes ajustes;

	ConfiguracionWeb(Ajustes ajustes) {
		this.ajustes = ajustes;
	}

	/** Solo el panel puede llamar a la API desde el navegador */
	@Override
	public void addCorsMappings(CorsRegistry registry) {
		registry.addMapping("/api/**")
				.allowedOrigins(ajustes.origenes().toArray(String[]::new))
				.allowedMethods("GET", "POST", "PUT", "DELETE");
		registry.addMapping("/actuator/health")
				.allowedOrigins(ajustes.origenes().toArray(String[]::new))
				.allowedMethods("GET");
	}

	/** La hora, cambiable en los tests */
	@Bean
	Clock reloj() {
		return Clock.systemUTC();
	}
}
