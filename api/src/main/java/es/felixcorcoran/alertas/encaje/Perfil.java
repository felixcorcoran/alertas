package es.felixcorcoran.alertas.encaje;

import java.util.Objects;
import java.util.Set;

import jakarta.persistence.Embeddable;

/**
 * El negocio, con las mismas respuestas que el formulario del radar (y los
 * mismos parámetros de su dirección: ?provincia=ES617&forma=autonomo…).
 *
 * @param provincia  código NUTS3 de la provincia o isla
 * @param municipio  opcional
 * @param forma      autonomo, sociedad o emprender
 * @param empleados  el mínimo del tramo: 0, 1, 10, 50 o 250
 * @param antiguedad nada, menos1, 1a3 o mas3
 * @param sector     letra de la sección CNAE, o vacío si no lo sabe
 */
@Embeddable
public record Perfil(String provincia, String municipio, String forma, int empleados, String antiguedad, String sector) {

	public static final Set<String> FORMAS = Set.of("autonomo", "sociedad", "emprender");
	public static final Set<Integer> TRAMOS = Set.of(0, 1, 10, 50, 250);
	public static final Set<String> ANTIGUEDADES = Set.of("nada", "menos1", "1a3", "mas3");

	public Perfil {
		municipio = Objects.requireNonNullElse(municipio, "").strip();
		sector = Objects.requireNonNullElse(sector, "").strip().toUpperCase();
		// Quien aún no ha empezado no tiene plantilla ni antigüedad
		if ("emprender".equals(forma)) {
			empleados = 0;
			antiguedad = "nada";
		}
	}

	/** Lo que no cuadra, o null si el perfil vale */
	public String error(Catalogo catalogo) {
		if (provincia == null || catalogo.provincia(provincia).isEmpty()) return "provincia";
		if (municipio.length() > 80) return "municipio";
		if (!FORMAS.contains(forma)) return "forma";
		if (!TRAMOS.contains(empleados)) return "empleados";
		if (!ANTIGUEDADES.contains(antiguedad) || (antiguedad.equals("nada") && !forma.equals("emprender"))) return "antiguedad";
		if (!sector.isEmpty() && (sector.length() != 1 || sector.charAt(0) < 'A' || sector.charAt(0) > 'V')) return "sector";
		return null;
	}
}
