package es.felixcorcoran.alertas.avisos;

import java.time.Instant;
import java.util.UUID;

import es.felixcorcoran.alertas.encaje.Encaje;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Una ayuda que encaja con alguien, hasta que sale en su correo */
@Entity
@Table(name = "avisos")
public class Aviso {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false)
	private UUID suscriptorId;

	@Column(nullable = false)
	private String codigo;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private Encaje.Estado estado;

	@Column(nullable = false)
	private Instant creado;

	private Instant enviado;

	protected Aviso() {
	}

	public Aviso(UUID suscriptorId, String codigo, Encaje.Estado estado, Instant creado) {
		this.suscriptorId = suscriptorId;
		this.codigo = codigo;
		this.estado = estado;
		this.creado = creado;
	}

	public UUID getSuscriptorId() {
		return suscriptorId;
	}

	public String getCodigo() {
		return codigo;
	}

	public void setEnviado(Instant enviado) {
		this.enviado = enviado;
	}
}
