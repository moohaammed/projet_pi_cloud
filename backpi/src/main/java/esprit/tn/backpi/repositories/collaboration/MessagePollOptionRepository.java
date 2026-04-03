package esprit.tn.backpi.repositories.collaboration;

import esprit.tn.backpi.entities.collaboration.MessagePollOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MessagePollOptionRepository extends JpaRepository<MessagePollOption, Long> {
}
