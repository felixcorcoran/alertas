package es.felixcorcoran.alertas.suscripciones;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SuscriptorRepository extends JpaRepository<Suscriptor, UUID> {

	Optional<Suscriptor> findByEmail(String email);

	Optional<Suscriptor> findByToken(String token);

	List<Suscriptor> findByEstado(Suscriptor.Estado estado);

	/** Para borrar a quien no confirmó a tiempo (RGPD: minimización) */
	long deleteByEstadoAndCreadoBefore(Suscriptor.Estado estado, Instant antes);
}
