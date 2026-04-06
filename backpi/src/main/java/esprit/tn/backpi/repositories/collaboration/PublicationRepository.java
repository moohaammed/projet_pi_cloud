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

    @Query("SELECT p FROM Publication p WHERE p.createdAt <= :now AND (p.chatGroup IS NULL OR EXISTS (SELECT 1 FROM p.chatGroup.members m WHERE m.id = :userId)) ORDER BY p.createdAt DESC")
    List<Publication> findPersonalizedFeed(@Param("userId") Long userId, @Param("now") Instant now);

    @Query("SELECT p FROM Publication p WHERE p.chatGroup.id = :groupId AND p.createdAt <= :now ORDER BY p.createdAt DESC")
    List<Publication> findByChatGroupIdOrderByCreatedAtDesc(@Param("groupId") Long groupId, @Param("now") Instant now);

    @Query("SELECT p FROM Publication p WHERE p.chatGroup IS NULL AND p.createdAt <= :now ORDER BY p.createdAt DESC")
    List<Publication> findByChatGroupIsNullOrderByCreatedAtDesc(@Param("now") Instant now);

    @Query("SELECT p FROM Publication p WHERE p.createdAt <= :now ORDER BY p.createdAt DESC")
    List<Publication> findAllByOrderByCreatedAtDesc(@Param("now") Instant now);

    List<Publication> findByModerationStatusOrderByModerationFlaggedAtDesc(ModerationStatus moderationStatus);

    long countByModerationStatus(ModerationStatus moderationStatus);

    long countByType(PublicationType type);

    List<Publication> findByTypeAndCreatedAtAfterOrderByCreatedAtAsc(PublicationType type, Instant now);
}