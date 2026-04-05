package esprit.tn.backpi.repositories.collaboration;

import esprit.tn.backpi.entities.collaboration.Publication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import esprit.tn.backpi.entities.collaboration.PublicationType;
import esprit.tn.backpi.entities.collaboration.ModerationStatus;

public interface PublicationRepository extends JpaRepository<Publication, Long> {
    List<Publication> findByType(PublicationType type);
    
    List<Publication> findByCreatedAtAfterOrderByCreatedAtDesc(Instant since);

    List<Publication> findAllByOrderByCreatedAtDesc();

    List<Publication> findByChatGroupIsNullOrderByCreatedAtDesc();

    List<Publication> findByChatGroupIdOrderByCreatedAtDesc(Long groupId);

    @Query("SELECT p FROM Publication p WHERE p.chatGroup IS NULL OR EXISTS (SELECT 1 FROM p.chatGroup.members m WHERE m.id = :userId) ORDER BY p.createdAt DESC")
    List<Publication> findPersonalizedFeed(@Param("userId") Long userId);

    List<Publication> findByModerationStatusOrderByModerationFlaggedAtDesc(ModerationStatus moderationStatus);

    long countByModerationStatus(ModerationStatus moderationStatus);
}