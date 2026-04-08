package esprit.tn.collab.repositories.collaboration;

import esprit.tn.collab.entities.collaboration.ModerationStatus;
import esprit.tn.collab.entities.collaboration.Publication;
import esprit.tn.collab.entities.collaboration.PublicationType;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;

public interface PublicationRepository extends MongoRepository<Publication, String> {

    List<Publication> findByType(PublicationType type);

    List<Publication> findByCreatedAtAfterOrderByCreatedAtDesc(Instant since);

    List<Publication> findByCreatedAtBeforeOrderByCreatedAtDesc(Instant now);

    List<Publication> findByChatGroupIdAndCreatedAtBeforeOrderByCreatedAtDesc(String chatGroupId, Instant now);

    List<Publication> findByChatGroupIdIsNullAndCreatedAtBeforeOrderByCreatedAtDesc(Instant now);

    List<Publication> findByModerationStatusOrderByModerationFlaggedAtDesc(ModerationStatus moderationStatus);

    long countByModerationStatus(ModerationStatus moderationStatus);

    long countByType(PublicationType type);

    List<Publication> findByTypeAndCreatedAtAfterOrderByCreatedAtAsc(PublicationType type, Instant now);
}
