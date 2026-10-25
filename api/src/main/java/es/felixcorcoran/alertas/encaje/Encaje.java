package es.felixcorcoran.alertas.encaje;

import java.util.List;

/** Si un negocio puede pedir una ayuda, y por qué */
public record Encaje(Estado estado, List<Motivo> motivos) {

	public enum Estado {
		si, revisa, no
	}

	/** @param tipo bien, revisa o no */
	public record Motivo(String tipo, String texto) {
	}
}
