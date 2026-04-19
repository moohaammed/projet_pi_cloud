package esprit.tn.backpi.repositories.gestion_patient;

import esprit.tn.backpi.entities.gestion_patient.Notificationpatient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface PatientNotificationRepository extends JpaRepository<Notificationpatient, Long> {
    
    @Query("SELECT n FROM PatientNotification n WHERE n.patient.id = :patientId ORDER BY n.createdAt DESC LIMIT 10")
    List<Notificationpatient> findTop10ByPatientIdOrderByCreatedAtDesc(@Param("patientId") Long patientId);

    @Query("SELECT COUNT(n) FROM PatientNotification n WHERE n.patient.id = :patientId AND n.isRead = false")
    long countByPatientIdAndIsReadFalse(@Param("patientId") Long patientId);

    @Modifying
    @Transactional
    @Query("UPDATE PatientNotification n SET n.isRead = true WHERE n.patient.id = :patientId")
    void markAllAsReadByPatientId(@Param("patientId") Long patientId);
}
