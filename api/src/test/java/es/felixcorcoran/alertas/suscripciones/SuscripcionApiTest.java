package es.felixcorcoran.alertas.suscripciones;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import es.felixcorcoran.alertas.PruebaIntegracion;

class SuscripcionApiTest extends PruebaIntegracion {

	private static final String OTRO_PERFIL = """
			{"provincia":"ES300","municipio":"","forma":"sociedad","empleados":10,"antiguedad":"mas3","sector":"G"}""";

	@Test
	void alApuntarseLlegaUnCorreoParaConfirmarYHastaEntoncesNoEstaActivo() throws Exception {
		alta("Ana@Ejemplo.es ", PERFIL).andExpect(status().isAccepted());

		assertThat(buzon.enviados).hasSize(1);
		assertThat(ultimo().para()).isEqualTo("ana@ejemplo.es");
		assertThat(ultimo().asunto()).isEqualTo("Confirma tus avisos de ayudas");
		assertThat(ultimo().texto()).contains("Autónomo o autónoma en Málaga · Hostelería · solo yo · de 1 a 3 años");
		String t = token(ultimo());

		mvc.perform(get("/api/suscripciones/" + t))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.confirmado").value(false));

		for (int i = 0; i < 2; i++) {
			mvc.perform(post("/api/suscripciones/confirmar").contentType(MediaType.APPLICATION_JSON).content("{\"token\":\"" + t + "\"}"))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.confirmado").value(true))
					.andExpect(jsonPath("$.perfil.provincia").value("ES617"));
		}
	}

	@Test
	void unEnlaceQueNoExisteNoDaNada() throws Exception {
		String falso = "a".repeat(43);
		mvc.perform(get("/api/suscripciones/" + falso)).andExpect(status().isNotFound());
		mvc.perform(post("/api/suscripciones/confirmar").contentType(MediaType.APPLICATION_JSON).content("{\"token\":\"" + falso + "\"}"))
				.andExpect(status().isNotFound());
		mvc.perform(get("/api/suscripciones/corto")).andExpect(status().isNotFound());
	}

	@Test
	void siYaEstaApuntadoNoSeCambiaNadaYSoloSeLeRecuerdaSuEnlace() throws Exception {
		String t = apuntado("ana@ejemplo.es", PERFIL);
		reloj.adelantar(Duration.ofHours(1));

		// La respuesta es la misma que para un email nuevo
		alta("ana@ejemplo.es", OTRO_PERFIL).andExpect(status().isAccepted());

		assertThat(ultimo().asunto()).isEqualTo("Ya recibes los avisos de ayudas");
		assertThat(token(ultimo())).isEqualTo(t);
		mvc.perform(get("/api/suscripciones/" + t)).andExpect(jsonPath("$.perfil.provincia").value("ES617"));
	}

	@Test
	void sinConfirmarValeElUltimoPerfilPeroNoSeRepiteElCorreoEnDiezMinutos() throws Exception {
		alta("ana@ejemplo.es", PERFIL);
		alta("ana@ejemplo.es", OTRO_PERFIL);
		assertThat(buzon.enviados).hasSize(1);

		reloj.adelantar(Duration.ofMinutes(11));
		alta("ana@ejemplo.es", OTRO_PERFIL);
		assertThat(buzon.enviados).hasSize(2);
		assertThat(token(buzon.enviados.get(1))).isEqualTo(token(buzon.enviados.get(0)));
		mvc.perform(get("/api/suscripciones/" + token(ultimo()))).andExpect(jsonPath("$.perfil.provincia").value("ES300"));
	}

	@Test
	void datosQueNoValen() throws Exception {
		alta("no-es-un-email", PERFIL).andExpect(status().isBadRequest());
		alta("ana@ejemplo.es", PERFIL.replace("ES617", "ES999")).andExpect(status().isBadRequest());
		alta("ana@ejemplo.es", PERFIL.replace("\"empleados\":0", "\"empleados\":7")).andExpect(status().isBadRequest());
		mvc.perform(post("/api/suscripciones").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"ana@ejemplo.es\",\"perfil\":" + PERFIL + ",\"acepto\":false}"))
				.andExpect(status().isBadRequest());
		assertThat(buzon.enviados).isEmpty();
	}

	@Test
	void conSuEnlaceCambiaSuNegocioYSeDaDeBaja() throws Exception {
		String t = apuntado("ana@ejemplo.es", PERFIL);

		mvc.perform(put("/api/suscripciones/" + t).contentType(MediaType.APPLICATION_JSON).content(OTRO_PERFIL))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.perfil.forma").value("sociedad"));
		mvc.perform(put("/api/suscripciones/" + t).contentType(MediaType.APPLICATION_JSON).content(OTRO_PERFIL.replace("ES300", "XX")))
				.andExpect(status().isBadRequest());

		mvc.perform(delete("/api/suscripciones/" + t)).andExpect(status().isNoContent());
		mvc.perform(get("/api/suscripciones/" + t)).andExpect(status().isNotFound());
	}

	@Test
	void bajaConUnClicDesdeElGestorDeCorreo() throws Exception {
		String t = apuntado("ana@ejemplo.es", PERFIL);
		mvc.perform(post("/api/baja/" + t).contentType(MediaType.APPLICATION_FORM_URLENCODED).content("List-Unsubscribe=One-Click"))
				.andExpect(status().isOk());
		mvc.perform(get("/api/suscripciones/" + t)).andExpect(status().isNotFound());
	}

	@Test
	void unaMismaIpNoPuedeApuntarDireccionesSinParar() throws Exception {
		for (int i = 0; i < 5; i++) alta("persona" + i + "@ejemplo.es", PERFIL, "198.51.100.7").andExpect(status().isAccepted());
		alta("persona6@ejemplo.es", PERFIL, "198.51.100.7").andExpect(status().isTooManyRequests());
	}
}
