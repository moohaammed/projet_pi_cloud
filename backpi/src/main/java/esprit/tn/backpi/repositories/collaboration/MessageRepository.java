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
}