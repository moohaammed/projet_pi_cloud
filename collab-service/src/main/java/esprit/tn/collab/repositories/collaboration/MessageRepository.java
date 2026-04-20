package esprit.tn.collab.repositories.collaboration;

import esprit.tn.collab.entities.collaboration.Message;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.time.Instant;
import java.util.List;

public interface MessageRepository extends MongoRepository<Message, String> {

    List<Message> findByChatGroupIdOrderBySentAtDesc(String chatGroupId);

    List<Message> findByChatGroupId(String chatGroupId);

    @Query("{ '$or': [ { 'senderId': ?0, 'receiverId': ?1 }, { 'senderId': ?1, 'receiverId': ?0 } ] }")
    List<Message> findDirectMessages(Long u1, Long u2);

    List<Message> findByChatGroupIdAndSentAtAfterOrderBySentAtAsc(String chatGroupId, Instant since);

    @Query("{ '$or': [ { 'receiverId': ?0, 'senderId': null }, { 'senderId': ?0, 'receiverId': null, 'type': 'BOT_MESSAGE' } ] }")
    List<Message> findBotMessages(Long userId);

    int countBySharedPublicationId(String sharedPublicationId);

    List<Message> findBySenderIdAndSentAtAfterOrderBySentAtDesc(Long senderId, Instant since);

    List<Message> findBySentAtAfterOrderBySentAtAsc(Instant since);

    // For admin DM stats — returns raw aggregation, handled in service
    @Query(value = "{ 'chatGroupId': null, 'senderId': { '$ne': null }, 'receiverId': { '$ne': null } }", fields = "{ 'senderId': 1, 'receiverId': 1, 'sentAt': 1, 'isDistressed': 1 }")
    List<Message> findDirectMessageRaw();

    @Query("{ 'chatGroupId': null, '$or': [ { 'senderId': ?0, 'receiverId': { '$ne': null } }, { 'receiverId': ?0, 'senderId': { '$ne': null } } ] }")
    List<Message> findRawConversations(Long userId);

    
    List<Message> findTop100ByChatGroupIdNotNullOrderBySentAtDesc();
}
