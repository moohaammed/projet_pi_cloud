package esprit.tn.backpi.repositories;

import esprit.tn.backpi.entities.Publication;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PublicationRepository extends JpaRepository<Publication, Long> {
}
