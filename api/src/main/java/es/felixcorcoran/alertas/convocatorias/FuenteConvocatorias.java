package es.felixcorcoran.alertas.convocatorias;

import java.util.List;
import java.util.Objects;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import es.felixcorcoran.alertas.Ajustes;
import tools.jackson.databind.json.JsonMapper;

/**
 * Las convocatorias abiertas, tal como las deja cada mañana la Action del
 * radar en su repositorio (público). Se leen del repositorio y no de la web
 * para no esperar a que Vercel la reconstruya.
 */
@Component
public class FuenteConvocatorias {

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Datos(String actualizado, List<Convocatoria> convocatorias) {
		public Datos {
			convocatorias = Objects.requireNonNullElse(convocatorias, List.of());
		}
	}

	private final RestClient http;
	private final JsonMapper json;

	public FuenteConvocatorias(RestClient.Builder builder, JsonMapper json, Ajustes ajustes) {
		this.http = builder.baseUrl(ajustes.fuente()).build();
		this.json = json;
	}

	public Datos leer() {
		// raw.githubusercontent.com lo sirve como text/plain: se lee como texto
		return leer(http.get().retrieve().body(String.class));
	}

	Datos leer(String texto) {
		return json.readValue(texto, Datos.class);
	}
}
