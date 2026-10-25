package es.felixcorcoran.alertas.avisos;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface VistaRepository extends JpaRepository<ConvocatoriaVista, String> {
}

interface AvisoRepository extends JpaRepository<Aviso, Long> {

	List<Aviso> findByEnviadoIsNullOrderBySuscriptorIdAscIdAsc();

	List<Aviso> findBySuscriptorIdAndEnviadoIsNull(UUID suscriptorId);

	/** Correos de avisos ya enviados desde una hora (uno por persona y pasada) */
	@Query("select count(distinct a.suscriptorId) from Aviso a where a.enviado >= :desde")
	long correosDesde(Instant desde);
}
