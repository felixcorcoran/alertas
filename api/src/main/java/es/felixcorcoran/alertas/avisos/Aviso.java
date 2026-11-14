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

/**
 * Una ayuda que encaja con alguien, hasta que sale en su correo; y después,
 * para avisarle si cambia su plazo. También las que sigue desde el radar
 * (seguida: no se le envían como nuevas, solo sus cambios de plazo).
 */
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

	/** El plazo de la última vez que se avisó de ella: AAAA-MM-DD, '' sin fecha, null si aún no se sabe */
	private String cierre;

	/** Hay un cambio de plazo por avisar (cierre aún guarda el de antes) */
	@Column(nullable = false)
	private boolean cambio;

	@Column(nullable = false)
	private boolean seguida;

	/** Ya se recordó que cierra en los próximos días */
	@Column(nullable = false)
	private boolean recordado;

	protected Aviso() {
	}

	public Aviso(UUID suscriptorId, String codigo, Encaje.Estado estado, Instant creado, String cierre) {
		this.suscriptorId = suscriptorId;
		this.codigo = codigo;
		this.estado = estado;
		this.creado = creado;
		this.cierre = cierre;
	}

	/** Una ayuda que sigue desde el radar: cuenta como ya enviada, y su plazo se apunta en la próxima pasada */
	public static Aviso seguida(UUID suscriptorId, String codigo, Instant ahora) {
		Aviso a = new Aviso(suscriptorId, codigo, Encaje.Estado.revisa, ahora, null);
		a.enviado = ahora;
		a.seguida = true;
		return a;
	}

	public Instant getEnviado() {
		return enviado;
	}

	public String getCierre() {
		return cierre;
	}

	public void setCierre(String cierre) {
		this.cierre = cierre;
	}

	public boolean isCambio() {
		return cambio;
	}

	public void setCambio(boolean cambio) {
		this.cambio = cambio;
	}

	public boolean isRecordado() {
		return recordado;
	}

	public void setRecordado(boolean recordado) {
		this.recordado = recordado;
	}

	public boolean isSeguida() {
		return seguida;
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
