package esprit.tn.patientmedecin.repositories;

import esprit.tn.patientmedecin.entities.Notificationpatient;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PatientNotificationRepository extends MongoRepository<Notificationpatient, Long> {

    @Query(sort = "{ 'createdAt': -1 }")
    List<Notificationpatient> findTop10ByPatient_Id(Long patientId);

    long countByPatient_IdAndIsReadFalse(Long patientId);

    // markAllAsReadByPatientId will be handled by MongoTemplate in the Service
}
