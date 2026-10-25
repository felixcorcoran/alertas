package es.felixcorcoran.alertas.encaje;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import es.felixcorcoran.alertas.convocatorias.Convocatoria;
import es.felixcorcoran.alertas.convocatorias.Convocatoria.Codigo;
import es.felixcorcoran.alertas.encaje.Encaje.Estado;
import es.felixcorcoran.alertas.encaje.Encaje.Motivo;

/**
 * ¿Puede este negocio pedir esta ayuda? La misma lógica que src/lib/encaje.ts
 * del radar, frase por frase: lo que dice la web y lo que llega por correo
 * tiene que ser lo mismo. EncajeContratoTest lo comprueba con miles de casos
 * calculados por el código del radar.
 *
 * Cuando un dato no consta, la ayuda queda en «revisa», nunca en «si».
 */
@Service
public class EncajeService {

	/** Tramos de plantilla: [mínimo, máximo] */
	private static final Map<Integer, int[]> TRAMOS = Map.of(
			0, new int[] { 0, 0 },
			1, new int[] { 1, 9 },
			10, new int[] { 10, 49 },
			50, new int[] { 50, 249 },
			250, new int[] { 250, Integer.MAX_VALUE });

	/** Meses de actividad de cada respuesta: [mínimo, máximo] */
	private static final Map<String, int[]> MESES = Map.of(
			"nada", new int[] { 0, 0 },
			"menos1", new int[] { 0, 11 },
			"1a3", new int[] { 12, 36 },
			"mas3", new int[] { 37, Integer.MAX_VALUE });

	private static final String ARTICULOS = "(el|la|los|las|o|a|os|as|l'|es|sa|ses|els|les)";
	private static final Pattern ARTICULO_DETRAS = Pattern.compile("^(.*),\\s*" + ARTICULOS + "$");
	private static final Pattern ARTICULO_DETRAS_I = Pattern.compile("^(.*),\\s*" + ARTICULOS + "$", Pattern.CASE_INSENSITIVE);
	private static final Pattern AYUNTAMIENTO = Pattern.compile("^AYUNTAMIENTO|^AJUNTAMENT|^CONCELLO|^UDALA", Pattern.CASE_INSENSITIVE);
	private static final Pattern PYME = Pattern.compile("PYME|SIN INFORMACION", Pattern.CASE_INSENSITIVE);
	private static final Pattern GRANDE = Pattern.compile("GRAN EMPRESA|SIN INFORMACION", Pattern.CASE_INSENSITIVE);
	private static final Pattern SECCION = Pattern.compile("^[A-V]$", Pattern.CASE_INSENSITIVE);
	private static final Set<String> ENLACES = Set.of("de", "del", "la", "las", "los", "el", "y", "i", "d'", "l'");
	private static final String[] NOMBRES_MES = { "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
			"agosto", "septiembre", "octubre", "noviembre", "diciembre" };

	private final Catalogo catalogo;

	public EncajeService(Catalogo catalogo) {
		this.catalogo = catalogo;
	}

	public Encaje encaje(Convocatoria c, Perfil p, String hoy) {
		List<Motivo> motivos = new ArrayList<>();
		var m = new Object() {
			void bien(String t) {
				motivos.add(new Motivo("bien", t));
			}

			void revisa(String t) {
				motivos.add(new Motivo("revisa", t));
			}

			void no(String t) {
				motivos.add(new Motivo("no", t));
			}
		};

		// Plazo
		String fin = c.cierre();
		if (fin != null && fin.compareTo(hoy) < 0) m.no("El plazo terminó el " + fechaLarga(fin));

		// Zona (códigos NUTS: ES, ES6, ES61, ES617…)
		List<Codigo> zonas = c.regiones().stream().filter(r -> r.codigo().startsWith("ES")).toList();
		if (zonas.isEmpty()) m.revisa("No indica la zona: comprueba en las bases dónde tiene que estar el negocio");
		else if (zonas.stream().anyMatch(r -> p.provincia().startsWith(r.codigo()))) {
			m.bien(zonas.stream().anyMatch(r -> r.codigo().equals("ES")) ? "Para toda España" : "Es para tu zona");
		} else m.no("Solo para negocios de " + zonas.stream()
				.map(r -> catalogo.nombreZona(r.codigo(), r.nombre()))
				.collect(Collectors.joining(", ")));

		// Municipio
		String municipio = municipioDe(c);
		if (municipio != null) {
			if (p.municipio().isBlank()) m.revisa("Es de " + municipio + ": normalmente solo para negocios de allí");
			else {
				String a = normalizarMunicipio(municipio);
				String b = normalizarMunicipio(p.municipio());
				if (a.equals(b) || a.contains(b) || b.contains(a)) m.bien("Es de tu municipio");
				else m.no("Solo para negocios de " + municipio);
			}
		}

		// Tamaño de empresa (tipos de beneficiario de la BDNS)
		int[] tramo = TRAMOS.getOrDefault(p.empleados(), new int[] { 0, 0 });
		int minEmp = tramo[0], maxEmp = tramo[1];
		boolean pyme = c.beneficiarios().stream().anyMatch(b -> PYME.matcher(b).find());
		boolean grande = c.beneficiarios().stream().anyMatch(b -> GRANDE.matcher(b).find());
		if (minEmp >= 250 && !grande) m.no("Solo para pymes y autónomos");
		if (minEmp < 250 && !pyme && grande) m.no("Solo para grandes empresas");

		// Sector
		Set<String> secciones = new LinkedHashSet<>();
		for (Codigo s : c.sectores()) {
			String letra = catalogo.seccionDe(s.codigo());
			if (letra != null) secciones.add(letra);
		}
		String nombres = secciones.stream().map(catalogo::nombreSeccion).collect(Collectors.joining(", "));
		if (secciones.isEmpty() || secciones.size() >= 8) m.bien("Abierta a cualquier sector");
		else if (p.sector().isEmpty()) m.revisa("Solo para algunos sectores: " + nombres);
		else if (secciones.contains(p.sector())) {
			List<Codigo> propios = c.sectores().stream().filter(s -> p.sector().equals(catalogo.seccionDe(s.codigo()))).toList();
			if (propios.stream().anyMatch(s -> SECCION.matcher(s.codigo().strip()).matches())) m.bien("Es para tu sector");
			else m.revisa("Solo para parte de tu sector: " + propios.stream().map(Codigo::nombre).collect(Collectors.joining(", ")));
		} else m.no("Es para otro sector: " + nombres);

		// Lo que dicen las bases
		var ia = c.ia();
		if (ia == null) {
			m.revisa("Aún no hemos leído las bases: mira los requisitos en la convocatoria");
		} else {
			var k = ia.condiciones();
			switch (p.forma()) {
				case "autonomo" -> {
					if ("no".equals(k.autonomos())) m.no("No admite autónomos");
					else if ("si".equals(k.autonomos())) m.bien("Admite autónomos");
				}
				case "sociedad" -> {
					if ("no".equals(k.sociedades())) m.no("No admite sociedades");
					else if ("si".equals(k.sociedades())) m.bien("Admite sociedades");
				}
				case "emprender" -> {
					int minimo = k.antiguedadMinMeses() == null ? 0 : k.antiguedadMinMeses();
					if ("si".equals(k.emprendedores())) m.bien("Sirve para quien aún no ha empezado");
					else if ("no".equals(k.emprendedores()) || minimo > 0) m.no("Hay que tener ya el negocio en marcha");
					else m.revisa("No dice si sirve para quien aún no ha empezado");
				}
				default -> {
				}
			}

			Integer max = k.maxEmpleados();
			if (max != null) {
				if (minEmp > max) m.no("Solo hasta " + max + " " + (max == 1 ? "trabajador" : "trabajadores"));
				else if (maxEmp <= max) m.bien("Tu plantilla entra");
				else m.revisa("Solo hasta " + max + " trabajadores: comprueba tu plantilla");
			}

			if (!p.forma().equals("emprender")) {
				int[] mes = MESES.get(p.antiguedad());
				int minMes = mes[0], maxMes = mes[1];
				Integer desde = k.antiguedadMinMeses();
				if (desde != null && desde > 0) {
					if (maxMes < desde) m.no("Pide al menos " + meses(desde) + " de actividad");
					else if (minMes >= desde) m.bien("Llevas el tiempo que pide");
					else m.revisa("Pide al menos " + meses(desde) + " de actividad");
				}
				Integer hasta = k.antiguedadMaxMeses();
				if (hasta != null) {
					if (minMes > hasta) m.no("Solo para negocios de menos de " + meses(hasta));
					else if (maxMes <= hasta) m.bien("Para negocios nuevos, como el tuyo");
					else m.revisa("Solo para negocios de menos de " + meses(hasta));
				}
			}
			if (ia.dudas() != null && !ia.dudas().isEmpty()) m.revisa(ia.dudas());
		}

		Estado estado = motivos.stream().anyMatch(x -> x.tipo().equals("no")) ? Estado.no
				: motivos.stream().anyMatch(x -> x.tipo().equals("revisa")) ? Estado.revisa : Estado.si;
		return new Encaje(estado, List.copyOf(motivos));
	}

	/** El municipio al que se limita la ayuda, si se sabe */
	public static String municipioDe(Convocatoria c) {
		if (c.organo().nivel1().equals("LOCAL") && AYUNTAMIENTO.matcher(c.organo().nivel3()).find()) {
			return nombreMunicipio(c.organo().nivel2());
		}
		return c.ia() == null ? null : c.ia().condiciones().municipio();
	}

	/** «CARBALLIÑO, O» → «o carballino»; «Málaga» → «malaga» */
	public static String normalizarMunicipio(String s) {
		String t = Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT).strip();
		Matcher m = ARTICULO_DETRAS.matcher(t);
		if (m.matches()) t = m.group(2) + " " + m.group(1);
		return t.replaceAll("[^a-z0-9ñ ]+", " ").replaceAll("\\s+", " ").strip();
	}

	/** «CARBALLIÑO, O» → «O Carballiño», para mostrarlo */
	public static String nombreMunicipio(String s) {
		String t = s.strip();
		Matcher m = ARTICULO_DETRAS_I.matcher(t);
		if (m.matches()) t = m.group(2) + " " + m.group(1);
		String[] palabras = t.toLowerCase(Locale.ROOT).split(" ", -1);
		StringBuilder sb = new StringBuilder();
		for (int i = 0; i < palabras.length; i++) {
			String w = palabras[i];
			if (i > 0) sb.append(' ');
			if ((i > 0 && ENLACES.contains(w)) || w.isEmpty()) sb.append(w);
			else sb.append(w.substring(0, 1).toUpperCase(Locale.ROOT)).append(w.substring(1));
		}
		return sb.toString();
	}

	private static String meses(int n) {
		if (n % 12 == 0) return (n / 12) + " " + (n == 12 ? "año" : "años");
		return n + " " + (n == 1 ? "mes" : "meses");
	}

	/** 2026-12-31 → «31 de diciembre de 2026» */
	public static String fechaLarga(String iso) {
		String[] p = iso.split("-");
		return Integer.parseInt(p[2]) + " de " + NOMBRES_MES[Integer.parseInt(p[1]) - 1] + " de " + Integer.parseInt(p[0]);
	}
}
