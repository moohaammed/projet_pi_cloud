package esprit.tn.backpi.repositories.collaboration;
import esprit.tn.backpi.entities.collaboration.Publication;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.List;
public interface PublicationRepository extends JpaRepository<Publication, Long> {
    List<Publication> findByCreatedAtAfterOrderByCreatedAtDesc(Instant since);
}