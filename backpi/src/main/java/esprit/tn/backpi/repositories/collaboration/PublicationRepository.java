package esprit.tn.backpi.repositories.collaboration;
import esprit.tn.backpi.entities.collaboration.Publication;
import org.springframework.data.jpa.repository.JpaRepository;
public interface PublicationRepository extends JpaRepository<Publication, Long> {
}