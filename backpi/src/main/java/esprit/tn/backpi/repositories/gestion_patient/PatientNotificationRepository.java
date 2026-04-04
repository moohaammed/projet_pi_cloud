package esprit.tn.backpi.repositories.gestion_patient;

import esprit.tn.backpi.entities.gestion_patient.Notificationpatient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PatientNotificationRepository extends JpaRepository<Notificationpatient, Long> {
}
