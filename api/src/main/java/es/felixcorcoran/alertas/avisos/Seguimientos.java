package es.felixcorcoran.alertas.avisos;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Las ayudas que alguien sigue desde el radar (sus guardadas): se apuntan al
 * darse de alta para avisarle si cambia su plazo. No se le envían como
 * nuevas: cuentan como ya enviadas.
 */
@Service
public class Seguimientos {

	/** Como mucho, las que se apuntan de una vez */
	public static final int MAX_SEGUIDAS = 50;
	private static final Pattern CODIGO = Pattern.compile("\\d{1,12}");

	private final AvisoRepository avisos;

	Seguimientos(AvisoRepository avisos) {
		this.avisos = avisos;
	}

	/** Solo códigos de la BDNS, sin repetir y con tope; lo demás se ignora */
	public static List<String> validas(List<String> codigos) {
		if (codigos == null) return List.of();
		return codigos.stream()
				.filter(c -> c != null && CODIGO.matcher(c.strip()).matches())
				.map(String::strip)
				.distinct()
				.limit(MAX_SEGUIDAS)
				.toList();
	}

	/** Las ayudas de alguien: las que se le han avisado o va a recibir y las que sigue */
	@Transactional(readOnly = true)
	public List<String> codigos(UUID suscriptor) {
		return avisos.findBySuscriptorId(suscriptor).stream().map(Aviso::getCodigo).toList();
	}

	@Transactional
	public void seguir(UUID suscriptor, List<String> codigos, Instant ahora) {
		for (String codigo : validas(codigos)) {
			if (!avisos.existsBySuscriptorIdAndCodigo(suscriptor, codigo)) avisos.save(Aviso.seguida(suscriptor, codigo, ahora));
		}
	}
}
