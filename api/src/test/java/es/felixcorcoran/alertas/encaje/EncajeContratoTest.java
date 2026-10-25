package es.felixcorcoran.alertas.encaje;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.List;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import es.felixcorcoran.alertas.convocatorias.Convocatoria;
import tools.jackson.databind.json.JsonMapper;

/**
 * El Java tiene que decir lo mismo que la web. Los casos (encaje/casos.json)
 * los calcula el código del radar con herramientas/casos-encaje.mts:
 * convocatorias reales y de prueba, y 60 negocios distintos.
 */
class EncajeContratoTest {

	@JsonIgnoreProperties(ignoreUnknown = true)
	record Caso(int c, int p, String hoy, Encaje.Estado estado, List<Encaje.Motivo> motivos) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	record Casos(List<Convocatoria> convocatorias, List<Perfil> perfiles, List<Caso> casos) {
	}

	private static Casos datos;
	private static EncajeService encajes;

	@BeforeAll
	static void cargar() throws Exception {
		JsonMapper json = JsonMapper.builder().build();
		try (InputStream in = new ClassPathResource("encaje/casos.json").getInputStream()) {
			datos = json.readValue(in, Casos.class);
		}
		encajes = new EncajeService(new Catalogo(json));
	}

	@Test
	void hayCasosDeLosTresEstados() {
		assertThat(datos.casos()).hasSizeGreaterThan(1000);
		assertThat(datos.casos()).extracting(Caso::estado).contains(Encaje.Estado.values());
	}

	@Test
	void mismoEstadoYMismosMotivosQueElRadar() {
		for (Caso caso : datos.casos()) {
			Convocatoria c = datos.convocatorias().get(caso.c());
			Perfil p = datos.perfiles().get(caso.p());
			Encaje e = encajes.encaje(c, p, caso.hoy());
			assertThat(e.motivos())
					.as("convocatoria %s, perfil %s, %s", c.codigo(), p, caso.hoy())
					.isEqualTo(caso.motivos());
			assertThat(e.estado()).isEqualTo(caso.estado());
		}
	}
}
