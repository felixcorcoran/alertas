package es.felixcorcoran.alertas;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import es.felixcorcoran.alertas.ConfiguracionDePrueba.Buzon;
import es.felixcorcoran.alertas.ConfiguracionDePrueba.FuenteDePrueba;
import es.felixcorcoran.alertas.ConfiguracionDePrueba.Reloj;
import es.felixcorcoran.alertas.correo.Correo.Mensaje;

/** Lo común a las pruebas con la aplicación entera y su base de datos */
@SpringBootTest(properties = { "alertas.clave-avisos=clave-de-prueba", "alertas.max-correos-dia=2" })
@Import(ConfiguracionDePrueba.class)
public abstract class PruebaIntegracion {

	/** Málaga, autónomo solo, de 1 a 3 años, hostelería */
	protected static final String PERFIL = """
			{"provincia":"ES617","municipio":"","forma":"autonomo","empleados":0,"antiguedad":"1a3","sector":"I"}""";

	private static final Pattern TOKEN = Pattern.compile("t=([A-Za-z0-9_-]{43})");
	private static final AtomicInteger IPS = new AtomicInteger();

	@Autowired
	private WebApplicationContext contexto;
	@Autowired
	private JdbcTemplate jdbc;
	@Autowired
	protected Buzon buzon;
	@Autowired
	protected FuenteDePrueba fuente;
	@Autowired
	protected Reloj reloj;

	protected MockMvc mvc;

	@BeforeEach
	void limpiar() {
		mvc = MockMvcBuilders.webAppContextSetup(contexto).build();
		jdbc.execute("truncate avisos, suscriptores, convocatorias_vistas");
		buzon.enviados.clear();
		fuente.convocatorias = List.of();
		reloj.poner(Reloj.INICIO);
	}

	/** Cada alta, desde una IP distinta (si no, salta el límite por IP) */
	protected ResultActions alta(String email, String perfil) throws Exception {
		return alta(email, perfil, "203.0.113." + IPS.incrementAndGet() % 250);
	}

	protected ResultActions alta(String email, String perfil, String ip) throws Exception {
		return mvc.perform(post("/api/suscripciones")
				.contentType(MediaType.APPLICATION_JSON)
				.header("X-Forwarded-For", ip)
				.content("""
						{"email":"%s","perfil":%s,"acepto":true}""".formatted(email, perfil)));
	}

	/** El token del enlace de un correo */
	protected static String token(Mensaje m) {
		Matcher x = TOKEN.matcher(m.texto());
		if (!x.find()) throw new AssertionError("El correo no lleva enlace: " + m.texto());
		return x.group(1);
	}

	protected Mensaje ultimo() {
		return buzon.enviados.getLast();
	}

	/** Se apunta y confirma; devuelve el token */
	protected String apuntado(String email, String perfil) throws Exception {
		alta(email, perfil);
		String t = token(ultimo());
		mvc.perform(post("/api/suscripciones/confirmar")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"token\":\"" + t + "\"}"));
		return t;
	}
}
