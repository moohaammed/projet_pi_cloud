package esprit.tn.collab.repositories.collaboration.admin;

import esprit.tn.collab.entities.collaboration.admin.MedicationComplianceLog;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;

public interface MedicationComplianceLogRepository extends MongoRepository<MedicationComplianceLog, String> {
    List<MedicationComplianceLog> findByCreatedAtAfterOrderByCreatedAtAsc(Instant since);
}
