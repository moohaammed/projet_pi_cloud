package esprit.tn.collab.repositories.collaboration;

import esprit.tn.collab.entities.collaboration.ChatGroup;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;

public interface ChatGroupRepository extends MongoRepository<ChatGroup, String> {

    @Query("{ 'memberIds': ?0 }")
    List<ChatGroup> findByMembersId(Long userId);

    
    List<ChatGroup> findByIsDefaultTrueAndDefaultForRole(String role);

    @Query("{ $text: { $search: ?0 } }")
    List<ChatGroup> searchByText(String query);

    @Query("{ 'tags': { $in: ?0 } }")
    List<ChatGroup> findByTagsIn(List<String> tags);

    @Query("{ $or: [ { 'name': { $regex: ?0, $options: 'i' } }, { 'description': { $regex: ?0, $options: 'i' } } ] }")
    List<ChatGroup> searchByRegex(String regex);
}
