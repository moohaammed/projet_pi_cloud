package esprit.tn.collab.repositories.collaboration.admin;

import esprit.tn.collab.entities.collaboration.admin.AdminAuditLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface AdminAuditLogRepository extends MongoRepository<AdminAuditLog, String> {
    List<AdminAuditLog> findTop100ByOrderByPerformedAtDesc();
    List<AdminAuditLog> findByAdminId(Long adminId);
}
