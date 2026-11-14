package es.felixcorcoran.alertas.guardadas;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.regex.Pattern;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Cuántas veces se guarda cada ayuda en el radar, por día (tabla guardadas):
 * para saber qué interesa, sin ningún dato de quien la guarda. Se guarda
 * medio año.
 */
@Service
public class Guardadas {

	private static final ZoneId MADRID = ZoneId.of("Europe/Madrid");
	private static final Pattern CODIGO = Pattern.compile("\\d{1,12}");
	static final int DIAS_QUE_SE_GUARDAN = 180;

	public record Cuenta(String codigo, long veces) {
	}

	private final JdbcTemplate jdbc;
	private final Clock reloj;

	public Guardadas(JdbcTemplate jdbc, Clock reloj) {
		this.jdbc = jdbc;
		this.reloj = reloj;
	}

	public static boolean valido(String codigo) {
		return codigo != null && CODIGO.matcher(codigo).matches();
	}

	/** Suma una a la ayuda, hoy (hora de Madrid) */
	public void sumar(String codigo) {
		if (!valido(codigo)) throw new IllegalArgumentException("codigo");
		jdbc.update("""
				insert into guardadas (dia, codigo, veces) values (?, ?, 1)
				on conflict (dia, codigo) do update set veces = guardadas.veces + 1""", hoy(), codigo);
	}

	/** Las más guardadas en los últimos días */
	public List<Cuenta> masGuardadas(int dias, int cuantas) {
		return jdbc.query("""
				select codigo, sum(veces) as veces from guardadas where dia > ?
				group by codigo order by veces desc, codigo limit ?""",
				(r, i) -> new Cuenta(r.getString("codigo"), r.getLong("veces")), hoy().minusDays(dias), cuantas);
	}

	/** Borra lo de hace más de medio año; devuelve las filas borradas */
	public int limpiar() {
		return jdbc.update("delete from guardadas where dia < ?", hoy().minusDays(DIAS_QUE_SE_GUARDAN));
	}

	private LocalDate hoy() {
		return LocalDate.ofInstant(reloj.instant(), MADRID);
	}
}
