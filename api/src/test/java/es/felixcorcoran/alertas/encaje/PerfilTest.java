package es.felixcorcoran.alertas.encaje;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import tools.jackson.databind.json.JsonMapper;

class PerfilTest {

	private final Catalogo catalogo = new Catalogo(JsonMapper.builder().build());

	private static Perfil perfil(String provincia, String forma, int empleados, String antiguedad, String sector) {
		return new Perfil(provincia, " Marbella ", forma, empleados, antiguedad, sector);
	}

	@Test
	void unPerfilDelRadarVale() {
		Perfil p = perfil("ES617", "autonomo", 0, "1a3", "i");
		assertThat(p.error(catalogo)).isNull();
		assertThat(p.municipio()).isEqualTo("Marbella");
		assertThat(p.sector()).isEqualTo("I");
	}

	@Test
	void quienAunNoHaEmpezadoNoTienePlantillaNiAntiguedad() {
		Perfil p = perfil("ES617", "emprender", 50, "mas3", "");
		assertThat(p.empleados()).isZero();
		assertThat(p.antiguedad()).isEqualTo("nada");
		assertThat(p.error(catalogo)).isNull();
	}

	@Test
	void cadaRespuestaTieneQueSerDeLasDelFormulario() {
		assertThat(perfil("ES999", "autonomo", 0, "1a3", "").error(catalogo)).isEqualTo("provincia");
		assertThat(perfil("ES617", "cooperativa", 0, "1a3", "").error(catalogo)).isEqualTo("forma");
		assertThat(perfil("ES617", "sociedad", 7, "1a3", "").error(catalogo)).isEqualTo("empleados");
		assertThat(perfil("ES617", "sociedad", 1, "nada", "").error(catalogo)).isEqualTo("antiguedad");
		assertThat(perfil("ES617", "sociedad", 1, "1a3", "Z").error(catalogo)).isEqualTo("sector");
		assertThat(new Perfil("ES617", "x".repeat(81), "autonomo", 0, "1a3", "").error(catalogo)).isEqualTo("municipio");
	}
}
