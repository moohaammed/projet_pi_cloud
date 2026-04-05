package esprit.tn.backpi.repositories.collaboration.admin;

import esprit.tn.backpi.entities.collaboration.admin.MedicationComplianceLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface MedicationComplianceLogRepository extends JpaRepository<MedicationComplianceLog, Long> {

    List<MedicationComplianceLog> findByCreatedAtAfterOrderByCreatedAtAsc(Instant since);

    /*
    @Query(value = """
            SELECT YEARWEEK(m.created_at, 1) AS yw,
                   COUNT(*) AS total,
                   SUM(CASE WHEN m.took_medication = 1 THEN 1 ELSE 0 END) AS yes_count
            FROM medication_compliance_logs m
            WHERE m.created_at >= :since
            GROUP BY YEARWEEK(m.created_at, 1)
            ORDER BY yw
            """, nativeQuery = true)
    List<Object[]> complianceAggregatesByWeekSince(@Param("since") Instant since);
    */
}
