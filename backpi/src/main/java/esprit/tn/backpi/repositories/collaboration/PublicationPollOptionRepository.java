package esprit.tn.backpi.repositories.collaboration;

import esprit.tn.backpi.entities.collaboration.PublicationPollOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PublicationPollOptionRepository extends JpaRepository<PublicationPollOption, Long> {
}
