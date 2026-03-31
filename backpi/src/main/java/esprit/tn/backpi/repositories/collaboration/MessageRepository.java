package esprit.tn.backpi.repositories.collaboration;
import esprit.tn.backpi.entities.collaboration.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByChatGroupIdOrderBySentAtAsc(Long chatGroupId);
    List<Message> findByChatGroupId(Long chatGroupId);
    List<Message> findBySenderIdOrReceiverIdOrderBySentAtAsc(Long senderId, Long receiverId);
}