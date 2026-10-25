package es.felixcorcoran.alertas;

import java.io.IOException;
import java.nio.file.Path;

import javax.sql.DataSource;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;

/**
 * La API en local, con su propio PostgreSQL (los datos quedan en
 * api/target/postgres) y los correos en el log:
 *
 *   ./mvnw spring-boot:test-run
 */
public class TestAlertasApplication {

	@TestConfiguration(proxyBeanMethods = false)
	static class BaseDeDatosLocal {
		@Bean(destroyMethod = "close")
		EmbeddedPostgres postgres() throws IOException {
			return EmbeddedPostgres.builder()
					.setPort(5433)
					.setDataDirectory(Path.of("target", "postgres"))
					.setCleanDataDirectory(false)
					.start();
		}

		@Bean
		DataSource dataSource(EmbeddedPostgres postgres) {
			return postgres.getPostgresDatabase();
		}
	}

	public static void main(String[] args) {
		SpringApplication.from(AlertasApplication::main).with(BaseDeDatosLocal.class).run(args);
	}

}
