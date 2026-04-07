package esprit.tn.collab.repositories.collaboration.admin;

import esprit.tn.collab.entities.collaboration.admin.SafetyAlertLog;
import esprit.tn.collab.entities.collaboration.admin.SafetyAlertStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public interface SafetyAlertLogRepository extends JpaRepository<SafetyAlertLog, Long> {
    long countByStatusNotIn(Collection<SafetyAlertStatus> statuses);
    List<SafetyAlertLog> findTop200ByOrderByCreatedAtDesc();
    List<SafetyAlertLog> findByCreatedAtAfterOrderByCreatedAtAsc(Instant since);
    boolean existsByRelatedMessageId(Long messageId);
}
