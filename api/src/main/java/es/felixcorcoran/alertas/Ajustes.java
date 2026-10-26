package es.felixcorcoran.alertas;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * La configuración (application.properties y variables de entorno).
 *
 * @param web           dirección del panel (enlaces de los correos)
 * @param api           dirección pública de esta API (baja con un clic desde el gestor de correo)
 * @param radar         dirección del Radar de subvenciones (fichas de las ayudas)
 * @param fuente        el JSON de convocatorias que publica el radar
 * @param origenes      desde dónde se puede llamar a la API (CORS)
 * @param claveAvisos   la que tiene que mandar el cron diario; vacía, el envío no se puede lanzar
 * @param remitente     el «De:» de los correos
 * @param resendClave   clave de Resend; vacía, los correos solo se escriben en el log (en local)
 * @param maxCorreosDia tope diario de correos de avisos (el plan gratuito de Resend llega a 100)
 */
@ConfigurationProperties("alertas")
public record Ajustes(
		String web,
		String api,
		String radar,
		String fuente,
		List<String> origenes,
		String claveAvisos,
		String remitente,
		String resendClave,
		int maxCorreosDia) {

	/** Versión del aviso de privacidad que se acepta al apuntarse */
	public static final String PRIVACIDAD = "2026-10-26";
}
