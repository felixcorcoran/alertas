package es.felixcorcoran.alertas.correo;

import static org.springframework.web.util.HtmlUtils.htmlEscape;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import es.felixcorcoran.alertas.Ajustes;
import es.felixcorcoran.alertas.convocatorias.Convocatoria;
import es.felixcorcoran.alertas.correo.Correo.Mensaje;
import es.felixcorcoran.alertas.encaje.Catalogo;
import es.felixcorcoran.alertas.encaje.Encaje;
import es.felixcorcoran.alertas.encaje.EncajeService;
import es.felixcorcoran.alertas.encaje.Perfil;

/**
 * Los tres correos: confirmar el alta, «ya estabas apuntado» y el de las
 * ayudas nuevas. HTML sencillo con estilos en línea (lo que entienden todos
 * los gestores de correo) y la misma versión en texto plano.
 */
@Component
public class Plantillas {

	private static final Map<String, String> FORMAS = Map.of(
			"autonomo", "Autónomo o autónoma", "sociedad", "Empresa (sociedad)", "emprender", "Aún no ha empezado");
	private static final Map<Integer, String> PLANTILLA = Map.of(
			0, "solo yo", 1, "de 1 a 9 personas", 10, "de 10 a 49 personas", 50, "de 50 a 249 personas", 250, "250 personas o más");
	private static final Map<String, String> ANTIGUEDAD = Map.of(
			"menos1", "menos de un año", "1a3", "de 1 a 3 años", "mas3", "más de 3 años");

	/** Una ayuda que encaja, para el correo */
	public record Ayuda(Convocatoria convocatoria, Encaje encaje) {
	}

	/**
	 * Una ayuda ya enviada o seguida cuyo plazo ha cambiado. Los plazos, en
	 * AAAA-MM-DD o '' si no hay fecha de cierre
	 */
	public record Cambio(Convocatoria convocatoria, String antes, String ahora) {
	}

	private final Ajustes ajustes;
	private final Catalogo catalogo;

	public Plantillas(Ajustes ajustes, Catalogo catalogo) {
		this.ajustes = ajustes;
		this.catalogo = catalogo;
	}

	public Mensaje confirmar(String email, Perfil perfil, String token) {
		String enlace = ajustes.web() + "/confirmar?t=" + token;
		String asunto = "Confirma tus avisos de ayudas";
		String texto = """
				Has pedido recibir por email las ayudas nuevas que encajen con tu negocio:
				%s

				Para empezar, confirma tu dirección:
				%s

				Si no lo has pedido tú, ignora este correo: sin confirmar no te enviaremos nada y borraremos tu dirección en 48 horas.
				""".formatted(resumen(perfil), enlace);
		String html = caja(asunto, """
				<p style="margin:0 0 12px">Has pedido recibir por email las ayudas nuevas que encajen con tu negocio:</p>
				<p style="margin:0 0 24px;color:#6B6B6B">%s</p>
				%s
				<p style="margin:24px 0 0;color:#6B6B6B;font-size:13px">Si no lo has pedido tú, ignora este correo: sin confirmar no te enviaremos nada y borraremos tu dirección en 48 horas.</p>
				""".formatted(htmlEscape(resumen(perfil)), boton("Confirmar mis avisos", enlace)), null);
		return new Mensaje(email, asunto, html, texto, Map.of());
	}

	/** Alguien ha vuelto a escribir un email que ya está apuntado: no se cambia nada, solo se le recuerda cómo gestionarlo */
	public Mensaje yaApuntado(String email, String token) {
		String enlace = ajustes.web() + "/gestionar?t=" + token;
		String asunto = "Ya recibes los avisos de ayudas";
		String texto = """
				Alguien (seguramente tú) ha vuelto a apuntar esta dirección a los avisos del Radar de subvenciones. Ya estaba apuntada, así que no hemos cambiado nada.

				Para cambiar los datos de tu negocio o darte de baja:
				%s
				""".formatted(enlace);
		String html = caja(asunto, """
				<p style="margin:0 0 24px">Alguien (seguramente tú) ha vuelto a apuntar esta dirección a los avisos del Radar de subvenciones. Ya estaba apuntada, así que no hemos cambiado nada.</p>
				%s
				""".formatted(boton("Cambiar mi negocio o darme de baja", enlace)), null);
		return new Mensaje(email, asunto, html, texto, Map.of());
	}

	public Mensaje avisos(String email, Perfil perfil, String token, List<Ayuda> ayudas) {
		return avisos(email, perfil, token, ayudas, List.of(), false);
	}

	/** «Hasta el 31 de diciembre de 2026», o «sin fecha de cierre confirmada» */
	private static String textoPlazo(String plazo) {
		return plazo == null || plazo.isEmpty() ? "sin fecha de cierre confirmada" : "hasta el " + EncajeService.fechaLarga(plazo);
	}

	/**
	 * El correo de cada persona: las ayudas nuevas que le encajan y, si los hay,
	 * los cambios de plazo de las que ya le enviamos o sigue desde el radar.
	 * Con frecuencia semanal, es su resumen de la semana.
	 */
	public Mensaje avisos(String email, Perfil perfil, String token, List<Ayuda> ayudas, List<Cambio> cambios, boolean semanal) {
		String asunto;
		if (ayudas.isEmpty())
			asunto = cambios.size() == 1 ? "Ha cambiado el plazo de una ayuda" : "Han cambiado los plazos de " + cambios.size() + " ayudas";
		else if (semanal)
			asunto = "Tu resumen semanal: " + (ayudas.size() == 1 ? "1 ayuda nueva" : ayudas.size() + " ayudas nuevas");
		else asunto = ayudas.size() == 1 ? "1 ayuda nueva para tu negocio" : ayudas.size() + " ayudas nuevas para tu negocio";
		String gestionar = ajustes.web() + "/gestionar?t=" + token;
		String baja = ajustes.web() + "/baja?t=" + token;
		String radar = ajustes.radar() + "/?" + parametros(perfil);

		StringBuilder texto = new StringBuilder();
		StringBuilder html = new StringBuilder();
		if (!ayudas.isEmpty()) {
			String desde = semanal ? "Publicadas esta semana" : "Publicadas desde el último aviso";
			texto.append(desde).append(" que encajan con tu negocio (").append(resumen(perfil)).append("):\n\n");
			html.append("""
					<p style="margin:0 0 20px;color:#6B6B6B">%s. Para tu negocio: %s.</p>
					""".formatted(desde, htmlEscape(resumen(perfil))));
		}
		for (Ayuda a : ayudas) {
			Convocatoria c = a.convocatoria();
			String ficha = ajustes.radar() + "/ayudas/" + c.codigo();
			String estado = a.encaje().estado() == Encaje.Estado.si ? "Puedes pedirla" : "Revisa los detalles";
			String importe = c.ia() != null && c.ia().importe() != null ? c.ia().importe() : null;
			// Sin fecha de cierre no se sabe si sigue abierta: se dice, en vez de callarlo
			String cierre = c.cierre() != null ? "Hasta el " + EncajeService.fechaLarga(c.cierre()) : "Sin fecha de cierre confirmada";
			List<String> datos = new ArrayList<>();
			if (importe != null) datos.add(importe);
			datos.add(cierre);
			String revisar = a.encaje().motivos().stream()
					.filter(m -> m.tipo().equals("revisa"))
					.map(Encaje.Motivo::texto)
					.collect(Collectors.joining(" · "));

			texto.append("• ").append(c.titulo()).append("\n  ").append(estado);
			if (!datos.isEmpty()) texto.append(" · ").append(String.join(" · ", datos));
			if (!revisar.isEmpty()) texto.append("\n  Revisa: ").append(revisar);
			texto.append("\n  ").append(ficha).append("\n\n");

			html.append("""
					<div style="margin:0 0 16px;padding:16px 18px;border:1px solid #E7E4DE;border-radius:14px;background:#fff">
					<p style="margin:0 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:%s">%s</p>
					<p style="margin:0 0 6px;font-size:16px;font-weight:600;line-height:1.35"><a href="%s" style="color:#171717;text-decoration:none">%s</a></p>
					%s%s%s
					<p style="margin:10px 0 0"><a href="%s" style="color:#C2513C">Ver la ayuda y sus requisitos</a></p>
					</div>
					""".formatted(
					a.encaje().estado() == Encaje.Estado.si ? "#2F7D4F" : "#9A6A00",
					estado,
					htmlEscape(ficha),
					htmlEscape(c.titulo()),
					c.ia() != null && c.ia().resumen() != null
							? "<p style=\"margin:0 0 6px;color:#3F3F3F\">" + htmlEscape(c.ia().resumen()) + "</p>" : "",
					datos.isEmpty() ? "" : "<p style=\"margin:0;color:#6B6B6B;font-size:14px\">" + htmlEscape(String.join(" · ", datos)) + "</p>",
					revisar.isEmpty() ? "" : "<p style=\"margin:6px 0 0;color:#6B6B6B;font-size:14px\">Revisa: " + htmlEscape(revisar) + "</p>",
					htmlEscape(ficha)));
		}
		if (!cambios.isEmpty()) {
			texto.append("Han cambiado de plazo (ayudas que te enviamos o que sigues desde el radar):\n\n");
			html.append("""
					<p style="margin:%s 0 12px;font-weight:600">Han cambiado de plazo</p>
					<p style="margin:0 0 16px;color:#6B6B6B">Ayudas que te enviamos o que sigues desde el radar.</p>
					""".formatted(ayudas.isEmpty() ? "0" : "28px"));
			for (Cambio x : cambios) {
				Convocatoria c = x.convocatoria();
				String ficha = ajustes.radar() + "/ayudas/" + c.codigo();
				String linea = "Ahora " + textoPlazo(x.ahora()) + " (antes, " + textoPlazo(x.antes()) + ")";
				texto.append("• ").append(c.titulo()).append("\n  ").append(linea).append("\n  ").append(ficha).append("\n\n");
				html.append("""
						<div style="margin:0 0 12px;padding:14px 18px;border:1px solid #E7E4DE;border-radius:14px;background:#fff">
						<p style="margin:0 0 6px;font-size:16px;font-weight:600;line-height:1.35"><a href="%s" style="color:#171717;text-decoration:none">%s</a></p>
						<p style="margin:0;color:#3F3F3F;font-size:14px">%s</p>
						</div>
						""".formatted(htmlEscape(ficha), htmlEscape(c.titulo()), htmlEscape(linea)));
			}
		}
		html.append(boton("Ver todas tus ayudas en el radar", radar));
		texto.append("Todas tus ayudas en el radar: ").append(radar).append("\n\n")
				.append("Los resúmenes son orientativos: lo que vale es la convocatoria oficial.\n")
				.append("Cambiar tu negocio: ").append(gestionar).append("\n")
				.append("Darte de baja: ").append(baja).append("\n");

		String pie = """
				Los resúmenes son orientativos: lo que vale es la convocatoria oficial.<br>
				<a href="%s" style="color:#6B6B6B">Cambiar mi negocio</a> · <a href="%s" style="color:#6B6B6B">Darme de baja</a>
				""".formatted(htmlEscape(gestionar), htmlEscape(baja));

		// Baja con un clic desde el propio gestor de correo (RFC 8058)
		Map<String, String> cabeceras = new LinkedHashMap<>();
		cabeceras.put("List-Unsubscribe", "<" + ajustes.api() + "/api/baja/" + token + ">");
		cabeceras.put("List-Unsubscribe-Post", "List-Unsubscribe=One-Click");
		return new Mensaje(email, asunto, caja(asunto, html.toString(), pie), texto.toString(), cabeceras);
	}

	/** «Autónomo o autónoma en Marbella (Málaga) · Hostelería · solo yo · de 1 a 3 años» */
	public String resumen(Perfil p) {
		String provincia = catalogo.provincia(p.provincia()).map(Catalogo.Provincia::nombre).orElse(p.provincia());
		List<String> partes = new ArrayList<>();
		partes.add(FORMAS.get(p.forma()) + " en " + (p.municipio().isEmpty() ? provincia : p.municipio() + " (" + provincia + ")"));
		partes.add(p.sector().isEmpty() ? "cualquier sector" : catalogo.nombreSeccion(p.sector()));
		if (!p.forma().equals("emprender")) {
			partes.add(PLANTILLA.get(p.empleados()));
			partes.add(ANTIGUEDAD.get(p.antiguedad()));
		}
		return String.join(" · ", partes);
	}

	/** Los mismos parámetros que usa el radar en su dirección */
	public static String parametros(Perfil p) {
		Map<String, String> q = new LinkedHashMap<>();
		q.put("provincia", p.provincia());
		q.put("forma", p.forma());
		q.put("sector", p.sector());
		if (!p.municipio().isEmpty()) q.put("municipio", p.municipio());
		if (!p.forma().equals("emprender")) {
			q.put("empleados", String.valueOf(p.empleados()));
			q.put("antiguedad", p.antiguedad());
		}
		return q.entrySet().stream()
				.map(e -> e.getKey() + "=" + URLEncoder.encode(e.getValue(), StandardCharsets.UTF_8))
				.collect(Collectors.joining("&"));
	}

	private static String boton(String texto, String enlace) {
		return """
				<a href="%s" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#171717;color:#FAF9F6;text-decoration:none;font-weight:600">%s</a>
				""".formatted(htmlEscape(enlace), htmlEscape(texto));
	}

	private String caja(String titulo, String cuerpo, String pie) {
		return """
				<!doctype html>
				<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>%s</title></head>
				<body style="margin:0;padding:24px 12px;background:#FAF9F6;color:#171717;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55">
				<div style="max-width:560px;margin:0 auto">
				<p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#C2513C">Radar de subvenciones</p>
				<h1 style="margin:0 0 20px;font-size:22px;line-height:1.25">%s</h1>
				%s
				<p style="margin:32px 0 0;padding-top:16px;border-top:1px solid #E7E4DE;color:#6B6B6B;font-size:12px">%s</p>
				</div></body></html>
				""".formatted(htmlEscape(titulo), htmlEscape(titulo), cuerpo,
				(pie != null ? pie + "<br>" : "") + "Hecho por <a href=\"https://felixcorcoran.es\" style=\"color:#6B6B6B\">Félix Corcoran</a> · <a href=\""
						+ htmlEscape(ajustes.web()) + "/privacidad\" style=\"color:#6B6B6B\">Privacidad</a>");
	}
}
