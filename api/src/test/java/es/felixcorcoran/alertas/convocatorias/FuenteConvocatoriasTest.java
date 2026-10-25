package es.felixcorcoran.alertas.convocatorias;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import com.sun.net.httpserver.HttpServer;

import es.felixcorcoran.alertas.Ajustes;
import tools.jackson.databind.json.JsonMapper;

class FuenteConvocatoriasTest {

	@Test
	void leeElJsonDelRepositorioAunqueLlegueComoTextoPlano() throws Exception {
		// Como raw.githubusercontent.com: JSON con Content-Type text/plain
		byte[] cuerpo = """
				{"actualizado":"2026-10-25","convocatorias":[{"codigo":"900001","titulo":"Ayudas al comercio",
				"organo":{"nivel1":"LOCAL","nivel2":"MARBELLA","nivel3":"AYUNTAMIENTO DE MARBELLA"},
				"regiones":[{"codigo":"ES617","nombre":"Málaga"}],"documento":{"id":1,"nombre":"bases.pdf"},
				"ia":{"categoria":"ayuda","plazoFin":"2026-12-31","condiciones":{"autonomos":"si"}},"iaModelo":"x"}]}
				""".getBytes(StandardCharsets.UTF_8);
		HttpServer servidor = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
		servidor.createContext("/", h -> {
			h.getResponseHeaders().add("Content-Type", "text/plain; charset=utf-8");
			h.sendResponseHeaders(200, cuerpo.length);
			h.getResponseBody().write(cuerpo);
			h.close();
		});
		servidor.start();
		try {
			String url = "http://127.0.0.1:" + servidor.getAddress().getPort() + "/datos/convocatorias.json";
			Ajustes ajustes = new Ajustes("", "", "", url, List.of(), "", "", "", 90);
			var datos = new FuenteConvocatorias(RestClient.builder(), JsonMapper.builder().build(), ajustes).leer();

			assertThat(datos.convocatorias()).hasSize(1);
			Convocatoria c = datos.convocatorias().getFirst();
			assertThat(c.cierre()).isEqualTo("2026-12-31");
			assertThat(c.beneficiarios()).isEmpty();
			assertThat(c.ia().condiciones().autonomos()).isEqualTo("si");
		} finally {
			servidor.stop(0);
		}
	}
}
