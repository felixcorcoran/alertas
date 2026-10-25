package es.felixcorcoran.alertas.avisos;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Una convocatoria ya repartida: cada ayuda se avisa una sola vez */
@Entity
@Table(name = "convocatorias_vistas")
public class ConvocatoriaVista {

	@Id
	private String codigo;

	@Column(nullable = false)
	private Instant vista;

	protected ConvocatoriaVista() {
	}

	public ConvocatoriaVista(String codigo, Instant vista) {
		this.codigo = codigo;
		this.vista = vista;
	}

	public String getCodigo() {
		return codigo;
	}
}
