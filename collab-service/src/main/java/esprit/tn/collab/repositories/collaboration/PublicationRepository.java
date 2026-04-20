package esprit.tn.collab.repositories.collaboration;

import esprit.tn.collab.entities.collaboration.ModerationStatus;
import esprit.tn.collab.entities.collaboration.Publication;
import esprit.tn.collab.entities.collaboration.PublicationType;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.time.Instant;
import java.util.List;

public interface PublicationRepository extends MongoRepository<Publication, String> {

    List<Publication> findByType(PublicationType type);

    List<Publication> findByCreatedAtAfterOrderByCreatedAtDesc(Instant since);

    List<Publication> findByCreatedAtBeforeOrderByCreatedAtDesc(Instant now);

    
    List<Publication> findTop50ByOrderByCreatedAtDesc();

    List<Publication> findByChatGroupIdAndCreatedAtBeforeOrderByCreatedAtDesc(String chatGroupId, Instant now);

    List<Publication> findByModerationStatusOrderByModerationFlaggedAtDesc(ModerationStatus moderationStatus);

    long countByModerationStatus(ModerationStatus moderationStatus);

    long countByType(PublicationType type);

    @Query("{ $and: [ { $text: { $search: ?0 } }, { $or: [ { 'chatGroupId': null }, { 'chatGroupId': '' }, { 'chatGroupId': { $in: ?1 } } ] } ] }")
    List<Publication> searchByText(String query, List<String> allowedGroupIds);

    @Query("{ $and: [ { 'tags': { $in: ?0 } }, { $or: [ { 'chatGroupId': null }, { 'chatGroupId': '' }, { 'chatGroupId': { $in: ?1 } } ] } ] }")
    List<Publication> findByTagsIn(List<String> tags, List<String> allowedGroupIds);

    @Query("{ $and: [ { 'content': { $regex: ?0, $options: 'i' } }, { $or: [ { 'chatGroupId': null }, { 'chatGroupId': '' }, { 'chatGroupId': { $in: ?1 } } ] } ] }")
    List<Publication> searchByRegex(String regex, List<String> allowedGroupIds);
}
