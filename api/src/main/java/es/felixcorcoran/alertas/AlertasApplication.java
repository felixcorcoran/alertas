package es.felixcorcoran.alertas;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * Avisos por email del Radar de subvenciones: cada persona guarda el perfil de
 * su negocio y, cada mañana, recibe las ayudas nuevas que encajan con él.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
public class AlertasApplication {

	public static void main(String[] args) {
		SpringApplication.run(AlertasApplication.class, args);
	}

}
