package es.felixcorcoran.alertas.avisos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;

import es.felixcorcoran.alertas.PruebaIntegracion;
import es.felixcorcoran.alertas.convocatorias.Convocatoria;
import es.felixcorcoran.alertas.convocatorias.Convocatoria.Analisis;
import es.felixcorcoran.alertas.convocatorias.Convocatoria.Codigo;
import es.felixcorcoran.alertas.convocatorias.Convocatoria.Condiciones;
import es.felixcorcoran.alertas.convocatorias.Convocatoria.Organo;

class AvisoServiceTest extends PruebaIntegracion {

	private final List<Convocatoria> publicadas = new ArrayList<>();

	/** Una ayuda de Andalucía para cualquier sector, abierta hasta fin de año */
	private static Convocatoria ayuda(String codigo, String region, String fin, boolean leida) {
		Analisis ia = new Analisis("ayuda", "Ayudas para digitalizar el comercio local.", "Hasta 3.000 € por negocio",
				"Hasta el 31 de diciembre.", null,
				new Condiciones("si", "si", "no_consta", null, null, null, null), null);
		return new Convocatoria(codigo, "Ayuda " + codigo, new Organo("AUTONOMICA", "ANDALUCÍA", "CONSEJERÍA"),
				List.of("PYME Y PERSONAS FÍSICAS QUE DESARROLLAN ACTIVIDAD ECONÓMICA"), List.of(),
				List.of(new Codigo(region, region)), fin, leida ? ia : null);
	}

	private void publicar(Convocatoria... cs) {
		publicadas.addAll(List.of(cs));
		fuente.convocatorias = List.copyOf(publicadas);
	}

	private ResultActions pasada() throws Exception {
		return mvc.perform(post("/api/avisos").header("Authorization", "Bearer clave-de-prueba")).andExpect(status().isOk());
	}

	@BeforeEach
	void yaHabiaConvocatorias() throws Exception {
		// La primera pasada solo toma nota de lo que ya había: no es nuevo para nadie
		publicar(ayuda("1", "ES61", "2026-12-31", true));
		apuntado("ana@ejemplo.es", PERFIL);
		buzon.enviados.clear();
		pasada().andExpect(jsonPath("$.nuevas").value(0)).andExpect(jsonPath("$.correos").value(0));
	}

	@Test
	void sinLaClaveDelCronNoSeLanza() throws Exception {
		mvc.perform(post("/api/avisos")).andExpect(status().isUnauthorized());
		mvc.perform(post("/api/avisos").header("Authorization", "Bearer otra")).andExpect(status().isUnauthorized());
	}

	@Test
	void unaAyudaNuevaQueEncajaLlegaUnaSolaVez() throws Exception {
		publicar(ayuda("2", "ES61", "2026-12-31", true));
		pasada().andExpect(jsonPath("$.nuevas").value(1)).andExpect(jsonPath("$.correos").value(1));

		assertThat(buzon.enviados).hasSize(1);
		var m = ultimo();
		assertThat(m.para()).isEqualTo("ana@ejemplo.es");
		assertThat(m.asunto()).isEqualTo("1 ayuda nueva para tu negocio");
		assertThat(m.texto()).contains("Ayuda 2", "Puedes pedirla", "Hasta el 31 de diciembre de 2026", "/ayudas/2")
				.doesNotContain("Ayuda 1");
		assertThat(m.html()).contains("Ayudas para digitalizar el comercio local.");
		// Baja con un clic desde el gestor de correo
		assertThat(m.cabeceras().get("List-Unsubscribe")).matches("<http://localhost:8080/api/baja/[A-Za-z0-9_-]{43}>");
		assertThat(m.cabeceras()).containsEntry("List-Unsubscribe-Post", "List-Unsubscribe=One-Click");

		reloj.adelantar(Duration.ofDays(1));
		pasada().andExpect(jsonPath("$.correos").value(0));
		assertThat(buzon.enviados).hasSize(1);
	}

	@Test
	void loQueNoEncajaNoSeManda() throws Exception {
		publicar(ayuda("2", "ES30", "2026-12-31", true));
		pasada().andExpect(jsonPath("$.nuevas").value(1)).andExpect(jsonPath("$.avisos").value(0));
		assertThat(buzon.enviados).isEmpty();
	}

	@Test
	void niLasCerradasNiLasQueNoSonAyudas() throws Exception {
		Convocatoria premio = ayuda("3", "ES61", "2026-12-31", true);
		premio = new Convocatoria(premio.codigo(), premio.titulo(), premio.organo(), premio.beneficiarios(), premio.sectores(),
				premio.regiones(), premio.fin(), new Analisis("premio", "", "", "", null, premio.ia().condiciones(), null));
		publicar(ayuda("2", "ES61", "2026-10-01", true), premio);
		pasada().andExpect(jsonPath("$.nuevas").value(0));
		assertThat(buzon.enviados).isEmpty();
	}

	@Test
	void unaAyudaSinLeerEsperaAQueLaIaLeaSusBases() throws Exception {
		publicar(ayuda("2", "ES61", "2026-12-31", false));
		pasada().andExpect(jsonPath("$.nuevas").value(0));

		publicadas.clear();
		publicar(ayuda("1", "ES61", "2026-12-31", true), ayuda("2", "ES61", "2026-12-31", true));
		reloj.adelantar(Duration.ofDays(1));
		pasada().andExpect(jsonPath("$.nuevas").value(1)).andExpect(jsonPath("$.correos").value(1));
	}

	@Test
	void quienNoHaConfirmadoNoRecibeNadaYSeBorraALas48Horas() throws Exception {
		alta("luis@ejemplo.es", PERFIL);
		String t = token(ultimo());
		buzon.enviados.clear();

		publicar(ayuda("2", "ES61", "2026-12-31", true));
		pasada().andExpect(jsonPath("$.correos").value(1));
		assertThat(buzon.enviados).extracting(m -> m.para()).containsExactly("ana@ejemplo.es");

		reloj.adelantar(Duration.ofHours(49));
		pasada().andExpect(jsonPath("$.sinConfirmarBorradas").value(1));
		mvc.perform(get("/api/suscripciones/" + t)).andExpect(status().isNotFound());
	}

	@Test
	void conElTopeDiarioLoQueNoCabeSaleAlDiaSiguiente() throws Exception {
		apuntado("luis@ejemplo.es", PERFIL);
		apuntado("eva@ejemplo.es", PERFIL);
		buzon.enviados.clear();

		// Tope de 2 correos al día en las pruebas
		publicar(ayuda("2", "ES61", "2026-12-31", true));
		pasada().andExpect(jsonPath("$.correos").value(2)).andExpect(jsonPath("$.pendientes").value(1));
		pasada().andExpect(jsonPath("$.correos").value(0)).andExpect(jsonPath("$.pendientes").value(1));

		reloj.adelantar(Duration.ofDays(1));
		pasada().andExpect(jsonPath("$.correos").value(1)).andExpect(jsonPath("$.pendientes").value(0));
		assertThat(buzon.enviados).extracting(m -> m.para())
				.containsExactlyInAnyOrder("ana@ejemplo.es", "luis@ejemplo.es", "eva@ejemplo.es");
	}
}
