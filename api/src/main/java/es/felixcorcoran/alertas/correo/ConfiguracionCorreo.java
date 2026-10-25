package es.felixcorcoran.alertas.correo;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

import es.felixcorcoran.alertas.Ajustes;

@Configuration(proxyBeanMethods = false)
class ConfiguracionCorreo {

	private static final Logger log = LoggerFactory.getLogger(ConfiguracionCorreo.class);

	/**
	 * Con clave de Resend, los correos salen de verdad (API HTTP: no hace falta
	 * SMTP ni su SDK). Sin ella, se escriben en el log y el HTML se guarda en
	 * target/correos: así se prueba todo en local sin mandar nada.
	 */
	@Bean
	Correo correo(Ajustes ajustes, RestClient.Builder builder) {
		if (ajustes.resendClave() == null || ajustes.resendClave().isBlank()) {
			log.warn("Sin RESEND_API_KEY: los correos se escriben en el log y no se envían");
			return m -> {
				log.info("Correo a {}: {}\n{}", m.para(), m.asunto(), m.texto());
				try {
					Path carpeta = Files.createDirectories(Path.of("target", "correos"));
					Files.writeString(carpeta.resolve(System.currentTimeMillis() + ".html"), m.html());
				} catch (IOException e) {
					log.warn("No se pudo guardar el HTML del correo: {}", e.getMessage());
				}
			};
		}
		RestClient resend = builder.baseUrl("https://api.resend.com")
				.defaultHeader("Authorization", "Bearer " + ajustes.resendClave())
				.build();
		return m -> resend.post()
				.uri("/emails")
				.body(Map.of(
						"from", ajustes.remitente(),
						"to", List.of(m.para()),
						"subject", m.asunto(),
						"html", m.html(),
						"text", m.texto(),
						"headers", m.cabeceras()))
				.retrieve()
				.toBodilessEntity();
	}
}
