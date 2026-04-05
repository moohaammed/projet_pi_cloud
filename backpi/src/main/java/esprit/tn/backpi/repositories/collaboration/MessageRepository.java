package esprit.tn.backpi.repositories.collaboration;

import esprit.tn.backpi.entities.collaboration.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findByChatGroupIdOrderBySentAtDesc(Long chatGroupId);

    List<Message> findByChatGroupId(Long chatGroupId);

    List<Message> findBySenderIdOrReceiverIdOrderBySentAtAsc(Long senderId, Long receiverId);

    @Query("SELECT m FROM Message m WHERE (m.sender.id = :u1 AND m.receiver.id = :u2) OR (m.sender.id = :u2 AND m.receiver.id = :u1) ORDER BY m.sentAt DESC")
    List<Message> findDirectMessages(@Param("u1") Long u1, @Param("u2") Long u2);

    List<Message> findByChatGroupIdAndSentAtAfterOrderBySentAtAsc(Long chatGroupId, Instant since);

    @Query("SELECT m FROM Message m WHERE (m.receiver.id = :u1 AND m.sender IS NULL) OR (m.sender.id = :u1 AND m.receiver IS NULL AND m.type = 'BOT_MESSAGE') ORDER BY m.sentAt DESC")
    List<Message> findBotMessages(@Param("u1") Long u1);

    int countBySharedPublicationId(Long sharedPublicationId);

    List<Message> findBySenderIdAndSentAtAfterOrderBySentAtDesc(Long senderId, Instant since);

    List<Message> findBySentAtAfterOrderBySentAtAsc(Instant since);

    /** Human-to-human direct messages only (excludes bot threads where sender is null). */
    @Query("SELECT m.sender.id, m.receiver.id, COUNT(m), MAX(m.sentAt), " +
            "COALESCE(SUM(CASE WHEN m.isDistressed = true THEN 1L ELSE 0L END), 0) " +
            "FROM Message m WHERE m.chatGroup IS NULL AND m.sender IS NOT NULL AND m.receiver IS NOT NULL " +
            "GROUP BY m.sender.id, m.receiver.id")
    List<Object[]> findDirectedDirectMessageStats();
}