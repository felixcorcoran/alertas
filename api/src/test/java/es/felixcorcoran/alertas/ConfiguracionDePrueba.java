package es.felixcorcoran.alertas;

import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import javax.sql.DataSource;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.web.client.RestClient;

import es.felixcorcoran.alertas.convocatorias.Convocatoria;
import es.felixcorcoran.alertas.convocatorias.FuenteConvocatorias;
import es.felixcorcoran.alertas.correo.Correo;
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import tools.jackson.databind.json.JsonMapper;

/**
 * Lo que cambia en las pruebas: un PostgreSQL embebido (de verdad, sin
 * Docker), correos que se guardan en una lista, convocatorias que pone cada
 * prueba y un reloj que se puede adelantar.
 */
@TestConfiguration(proxyBeanMethods = false)
public class ConfiguracionDePrueba {

	@Bean(destroyMethod = "close")
	EmbeddedPostgres postgres() throws IOException {
		return EmbeddedPostgres.start();
	}

	@Bean
	DataSource dataSource(EmbeddedPostgres postgres) {
		return postgres.getPostgresDatabase();
	}

	@Bean
	@Primary
	Buzon buzon() {
		return new Buzon();
	}

	@Bean
	@Primary
	FuenteDePrueba fuenteDePrueba(Ajustes ajustes) {
		return new FuenteDePrueba(ajustes);
	}

	@Bean
	@Primary
	Reloj relojDePrueba() {
		return new Reloj();
	}

	/** Los correos enviados, en orden */
	public static class Buzon implements Correo {
		public final List<Mensaje> enviados = new CopyOnWriteArrayList<>();

		@Override
		public void enviar(Mensaje mensaje) {
			enviados.add(mensaje);
		}
	}

	public static class FuenteDePrueba extends FuenteConvocatorias {
		public volatile List<Convocatoria> convocatorias = List.of();

		FuenteDePrueba(Ajustes ajustes) {
			super(RestClient.builder(), JsonMapper.builder().build(), ajustes);
		}

		@Override
		public Datos leer() {
			return new Datos("2026-10-25", convocatorias);
		}
	}

	/** Empieza el 25 de octubre de 2026 a las 8:30 (hora de Madrid) */
	public static class Reloj extends Clock {
		public static final Instant INICIO = Instant.parse("2026-10-25T07:30:00Z");
		private volatile Instant ahora = INICIO;

		public void poner(Instant instante) {
			ahora = instante;
		}

		public void adelantar(Duration d) {
			ahora = ahora.plus(d);
		}

		@Override
		public Instant instant() {
			return ahora;
		}

		@Override
		public ZoneId getZone() {
			return ZoneOffset.UTC;
		}

		@Override
		public Clock withZone(ZoneId zone) {
			return this;
		}
	}
}
