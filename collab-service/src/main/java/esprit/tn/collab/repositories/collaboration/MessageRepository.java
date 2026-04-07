package esprit.tn.collab.repositories.collaboration;

import esprit.tn.collab.entities.collaboration.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findByChatGroupIdOrderBySentAtDesc(Long chatGroupId);

    List<Message> findByChatGroupId(Long chatGroupId);

    @Query("SELECT m FROM Message m WHERE (m.senderId = :u1 AND m.receiverId = :u2) OR (m.senderId = :u2 AND m.receiverId = :u1) ORDER BY m.sentAt DESC")
    List<Message> findDirectMessages(@Param("u1") Long u1, @Param("u2") Long u2);

    List<Message> findByChatGroupIdAndSentAtAfterOrderBySentAtAsc(Long chatGroupId, Instant since);

    @Query("SELECT m FROM Message m WHERE (m.receiverId = :u1 AND m.senderId IS NULL) OR (m.senderId = :u1 AND m.receiverId IS NULL AND m.type = 'BOT_MESSAGE') ORDER BY m.sentAt DESC")
    List<Message> findBotMessages(@Param("u1") Long u1);

    int countBySharedPublicationId(Long sharedPublicationId);

    List<Message> findBySenderIdAndSentAtAfterOrderBySentAtDesc(Long senderId, Instant since);

    List<Message> findBySentAtAfterOrderBySentAtAsc(Instant since);

    @Query("SELECT m.senderId, m.receiverId, COUNT(m), MAX(m.sentAt), " +
            "COALESCE(SUM(CASE WHEN m.isDistressed = true THEN 1L ELSE 0L END), 0) " +
            "FROM Message m WHERE m.chatGroup IS NULL AND m.senderId IS NOT NULL AND m.receiverId IS NOT NULL " +
            "GROUP BY m.senderId, m.receiverId")
    List<Object[]> findDirectedDirectMessageStats();
}
