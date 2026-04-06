package esprit.tn.backpi.repositories.collaboration;

import esprit.tn.backpi.entities.collaboration.ChatGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ChatGroupRepository extends JpaRepository<ChatGroup, Long> {
    Optional<ChatGroup> findByName(String name);

    List<ChatGroup> findByMembersId(Long userId);
}
