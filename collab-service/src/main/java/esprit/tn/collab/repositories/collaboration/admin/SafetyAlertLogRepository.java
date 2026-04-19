package esprit.tn.collab.repositories.collaboration.admin;

import esprit.tn.collab.entities.collaboration.admin.SafetyAlertLog;
import esprit.tn.collab.entities.collaboration.admin.SafetyAlertStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public interface SafetyAlertLogRepository extends MongoRepository<SafetyAlertLog, String> {
    long countByStatusNotIn(Collection<SafetyAlertStatus> statuses);
    List<SafetyAlertLog> findTop200ByOrderByCreatedAtDesc();
    List<SafetyAlertLog> findByCreatedAtAfterOrderByCreatedAtAsc(Instant since);
    boolean existsByRelatedMessageId(Long messageId);
}
