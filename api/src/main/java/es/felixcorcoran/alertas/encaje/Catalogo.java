package es.felixcorcoran.alertas.encaje;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/**
 * Las provincias e islas de la BDNS y las secciones de la CNAE-2025: los
 * mismos ficheros (datos/) que usan el radar y el panel.
 */
@Component
public class Catalogo {

	public record Provincia(String codigo, String nombre, String comunidad, String codigoComunidad) {
	}

	public record Seccion(String letra, String nombre, int desde, int hasta) {
	}

	private static final Pattern LETRA = Pattern.compile("^[A-V]$");
	private static final Pattern DIVISION = Pattern.compile("^[0-9]+");

	private final List<Provincia> provincias;
	private final List<Seccion> secciones;
	private final Map<String, String> zonas = new HashMap<>();

	public Catalogo(JsonMapper json) {
		provincias = leer(json, "datos/provincias.json", new TypeReference<>() {
		});
		secciones = leer(json, "datos/sectores.json", new TypeReference<>() {
		});
		zonas.put("ES", "toda España");
		for (Provincia p : provincias) {
			zonas.put(p.codigo(), p.nombre());
			zonas.put(p.codigoComunidad(), p.comunidad());
		}
	}

	private static <T> T leer(JsonMapper json, String ruta, TypeReference<T> tipo) {
		try (InputStream in = new ClassPathResource(ruta).getInputStream()) {
			return json.readValue(in, tipo);
		} catch (IOException e) {
			throw new UncheckedIOException(e);
		}
	}

	public List<Provincia> provincias() {
		return provincias;
	}

	public Optional<Provincia> provincia(String codigo) {
		return provincias.stream().filter(p -> p.codigo().equals(codigo)).findFirst();
	}

	/** El nombre de una zona (código NUTS) bien escrito: la BDNS pone «PAIS VASCO» */
	public String nombreZona(String codigo, String original) {
		return zonas.getOrDefault(codigo, original);
	}

	/** La sección (letra) de un código de sector de la BDNS, o null si no se reconoce */
	public String seccionDe(String codigo) {
		String c = codigo.strip().toUpperCase();
		if (LETRA.matcher(c).matches()) return c;
		Matcher m = DIVISION.matcher(c);
		if (!m.find()) return null;
		int division = Integer.parseInt(m.group());
		return secciones.stream()
				.filter(s -> division >= s.desde() && division <= s.hasta())
				.map(Seccion::letra)
				.findFirst()
				.orElse(null);
	}

	public String nombreSeccion(String letra) {
		return secciones.stream().filter(s -> s.letra().equals(letra)).map(Seccion::nombre).findFirst().orElse(letra);
	}
}
