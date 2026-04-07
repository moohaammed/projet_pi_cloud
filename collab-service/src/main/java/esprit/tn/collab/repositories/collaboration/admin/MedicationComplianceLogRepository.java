package esprit.tn.collab.repositories.collaboration.admin;

import esprit.tn.collab.entities.collaboration.admin.MedicationComplianceLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface MedicationComplianceLogRepository extends JpaRepository<MedicationComplianceLog, Long> {
    List<MedicationComplianceLog> findByCreatedAtAfterOrderByCreatedAtAsc(Instant since);
}
