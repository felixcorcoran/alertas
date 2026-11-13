package es.felixcorcoran.alertas.suscripciones;

import java.time.Instant;
import java.util.UUID;

import es.felixcorcoran.alertas.encaje.Perfil;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Quien se ha apuntado a los avisos (ver db/migration/V1__esquema.sql) */
@Entity
@Table(name = "suscriptores")
public class Suscriptor {

	/** Cada cuánto recibe los avisos */
	public enum Frecuencia {
		/** Un correo cada día que haya algo */
		DIARIA,
		/** Como mucho un correo a la semana, con todo junto */
		SEMANAL;

		/** «diaria» o «semanal», como en la API; null o vacío, diaria */
		public static Frecuencia de(String texto) {
			if (texto == null || texto.isBlank()) return DIARIA;
			return switch (texto.strip().toLowerCase(java.util.Locale.ROOT)) {
				case "diaria" -> DIARIA;
				case "semanal" -> SEMANAL;
				default -> throw new IllegalArgumentException("frecuencia");
			};
		}

		public String texto() {
			return name().toLowerCase(java.util.Locale.ROOT);
		}
	}

	public enum Estado {
		/** Se ha apuntado pero aún no ha pulsado el enlace del correo */
		PENDIENTE,
		ACTIVO
	}

	@Id
	private UUID id;

	@Column(nullable = false, unique = true)
	private String email;

	@Embedded
	private Perfil perfil;

	@Column(nullable = false, unique = true)
	private String token;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private Estado estado;

	@Column(nullable = false)
	private String consentimiento;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private Frecuencia frecuencia = Frecuencia.DIARIA;

	@Column(nullable = false)
	private Instant creado;

	private Instant confirmado;
	private Instant ultimoAlta;
	private Instant ultimoAviso;

	protected Suscriptor() {
	}

	public Suscriptor(String email, Perfil perfil, String token, String consentimiento, Instant ahora) {
		this.id = UUID.randomUUID();
		this.email = email;
		this.perfil = perfil;
		this.token = token;
		this.estado = Estado.PENDIENTE;
		this.consentimiento = consentimiento;
		this.creado = ahora;
	}

	public void confirmar(Instant ahora) {
		if (estado == Estado.PENDIENTE) {
			estado = Estado.ACTIVO;
			confirmado = ahora;
		}
	}

	public UUID getId() {
		return id;
	}

	public String getEmail() {
		return email;
	}

	public Perfil getPerfil() {
		return perfil;
	}

	public void setPerfil(Perfil perfil) {
		this.perfil = perfil;
	}

	public String getToken() {
		return token;
	}

	public Estado getEstado() {
		return estado;
	}

	public void setConsentimiento(String consentimiento) {
		this.consentimiento = consentimiento;
	}

	public Instant getUltimoAlta() {
		return ultimoAlta;
	}

	public void setUltimoAlta(Instant ultimoAlta) {
		this.ultimoAlta = ultimoAlta;
	}

	public void setUltimoAviso(Instant ultimoAviso) {
		this.ultimoAviso = ultimoAviso;
	}

	public Instant getUltimoAviso() {
		return ultimoAviso;
	}

	public Frecuencia getFrecuencia() {
		return frecuencia;
	}

	public void setFrecuencia(Frecuencia frecuencia) {
		this.frecuencia = frecuencia;
	}
}
