package es.felixcorcoran.alertas.avisos;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

import es.felixcorcoran.alertas.ConfiguracionDePrueba;
import es.felixcorcoran.alertas.convocatorias.Convocatoria;

/** Como la arranca GitHub Actions: sin servidor web, hace la pasada al arrancar */
@SpringBootTest(properties = { "alertas.pasada=true", "spring.main.web-application-type=none" })
@Import(ConfiguracionDePrueba.class)
class PasadaTest {

	@Autowired
	private Pasada pasada;
	@Autowired
	private ConfiguracionDePrueba.FuenteDePrueba fuente;
	@Autowired
	private JdbcTemplate jdbc;

	@Test
	void arrancaSinServidorYHaceLaPasada() throws Exception {
		jdbc.execute("truncate avisos, suscriptores, convocatorias_vistas");
		fuente.convocatorias = List.of(new Convocatoria("1", "Ayuda 1", null, null, null, null, "2026-12-31", null));

		pasada.run(null);

		// La primera pasada toma nota de lo que ya había
		assertThat(jdbc.queryForObject("select count(*) from convocatorias_vistas", Integer.class)).isEqualTo(1);
		// Y la tabla del límite de las funciones de Vercel existe (V2)
		assertThat(jdbc.queryForObject("select count(*) from limites", Integer.class)).isZero();
	}
}
