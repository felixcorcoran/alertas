package es.felixcorcoran.alertas.correo;

import java.util.Map;

/** Quien manda los correos: Resend en producción, el log en local */
public interface Correo {

	/**
	 * @param cabeceras extra, como List-Unsubscribe para la baja con un clic
	 */
	record Mensaje(String para, String asunto, String html, String texto, Map<String, String> cabeceras) {
	}

	void enviar(Mensaje mensaje);
}
