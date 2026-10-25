package es.felixcorcoran.alertas.web;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Un máximo de peticiones por IP cada 10 minutos, en memoria (hay una sola
 * instancia). Frena a quien intente apuntar direcciones ajenas en bucle.
 */
public class LimitePorIp {

	private static final long VENTANA = Duration.ofMinutes(10).toMillis();

	private record Cuenta(long desde, int veces) {
	}

	private final int maximo;
	private final ConcurrentHashMap<String, Cuenta> cuentas = new ConcurrentHashMap<>();

	public LimitePorIp(int maximo) {
		this.maximo = maximo;
	}

	/** Cuenta esta petición y dice si ya se ha pasado del máximo */
	public boolean superado(String ip) {
		long ahora = System.currentTimeMillis();
		if (cuentas.size() > 10_000) cuentas.values().removeIf(c -> ahora - c.desde() > VENTANA);
		Cuenta c = cuentas.compute(ip, (k, v) -> v == null || ahora - v.desde() > VENTANA
				? new Cuenta(ahora, 1)
				: new Cuenta(v.desde(), v.veces() + 1));
		return c.veces() > maximo;
	}

	/** La IP de quien llama: detrás del proxy de Render, la primera de X-Forwarded-For */
	public static String ip(HttpServletRequest peticion) {
		String reenviada = peticion.getHeader("X-Forwarded-For");
		if (reenviada != null && !reenviada.isBlank()) return reenviada.split(",")[0].strip();
		return peticion.getRemoteAddr();
	}
}
