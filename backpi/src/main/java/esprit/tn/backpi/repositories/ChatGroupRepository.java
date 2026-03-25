package esprit.tn.backpi.repositories;

import esprit.tn.backpi.entities.ChatGroup;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatGroupRepository extends JpaRepository<ChatGroup, Long> {
}
