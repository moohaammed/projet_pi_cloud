package esprit.tn.backpi.repository;

import esprit.tn.backpi.entity.PatientContact;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface PatientContactRepository extends MongoRepository<PatientContact, Long> {

    List<PatientContact> findByPatientUserId(Long patientUserId);

    Optional<PatientContact> findByIdAndPatientUserId(Long id, Long patientUserId);
}
