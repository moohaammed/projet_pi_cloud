package esprit.tn.backpi.repositories.collaboration;

import esprit.tn.backpi.entities.collaboration.ChatGroup;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatGroupRepository extends JpaRepository<ChatGroup, Long> {
}
