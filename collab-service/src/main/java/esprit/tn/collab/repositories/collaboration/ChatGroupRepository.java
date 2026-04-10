package esprit.tn.collab.repositories.collaboration;

import esprit.tn.collab.entities.collaboration.ChatGroup;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ChatGroupRepository extends MongoRepository<ChatGroup, String> {
    Optional<ChatGroup> findByName(String name);

    @Query("{ 'memberIds': ?0 }")
    List<ChatGroup> findByMembersId(Long userId);
}
