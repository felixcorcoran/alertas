package es.felixcorcoran.alertas.convocatorias;

import java.util.List;
import java.util.Objects;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Una convocatoria del radar (datos/convocatorias.json del repositorio
 * subvenciones), solo con lo que hace falta para el encaje y el correo.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record Convocatoria(
		String codigo,
		String titulo,
		Organo organo,
		List<String> beneficiarios,
		List<Codigo> sectores,
		List<Codigo> regiones,
		String fin,
		Analisis ia) {

	public Convocatoria {
		beneficiarios = Objects.requireNonNullElse(beneficiarios, List.of());
		sectores = Objects.requireNonNullElse(sectores, List.of());
		regiones = Objects.requireNonNullElse(regiones, List.of());
		organo = Objects.requireNonNullElse(organo, new Organo("", "", ""));
	}

	/** Fecha de cierre conocida (AAAA-MM-DD), de la IA o de la propia ficha */
	public String cierre() {
		return ia != null && ia.plazoFin() != null ? ia.plazoFin() : fin;
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Organo(String nivel1, String nivel2, String nivel3) {
		public Organo {
			nivel1 = Objects.requireNonNullElse(nivel1, "");
			nivel2 = Objects.requireNonNullElse(nivel2, "");
			nivel3 = Objects.requireNonNullElse(nivel3, "");
		}
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Codigo(String codigo, String nombre) {
	}

	/** Lo que la IA ha leído en las bases */
	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Analisis(
			String categoria,
			String resumen,
			String importe,
			String plazo,
			String plazoFin,
			Condiciones condiciones,
			String dudas) {

		public Analisis {
			condiciones = Objects.requireNonNullElse(condiciones,
					new Condiciones("no_consta", "no_consta", "no_consta", null, null, null, null));
		}
	}

	/** si, no o no_consta; los números, null si las bases no los dicen */
	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Condiciones(
			String autonomos,
			String sociedades,
			String emprendedores,
			Integer maxEmpleados,
			Integer antiguedadMinMeses,
			Integer antiguedadMaxMeses,
			String municipio) {
	}
}
