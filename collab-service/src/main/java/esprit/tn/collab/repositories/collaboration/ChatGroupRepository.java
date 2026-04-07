package esprit.tn.collab.repositories.collaboration;

import esprit.tn.collab.entities.collaboration.ChatGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ChatGroupRepository extends JpaRepository<ChatGroup, Long> {
    Optional<ChatGroup> findByName(String name);

    @Query("SELECT g FROM ChatGroup g JOIN g.memberIds m WHERE m = :userId")
    List<ChatGroup> findByMembersId(@Param("userId") Long userId);
}
