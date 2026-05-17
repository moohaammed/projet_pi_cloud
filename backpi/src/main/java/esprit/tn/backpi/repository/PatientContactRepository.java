package esprit.tn.backpi.repository;

import esprit.tn.backpi.entity.PatientContact;
import esprit.tn.backpi.entity.RelationType;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface PatientContactRepository extends MongoRepository<PatientContact, Long> {

    List<PatientContact> findByPatientUserId(Long patientUserId);

    List<PatientContact> findByContactUserId(Long contactUserId);

    List<PatientContact> findByRelationTypeAndContactUserId(RelationType relationType, Long contactUserId);

    List<PatientContact> findByEmailIgnoreCase(String email);

    Optional<PatientContact> findByIdAndPatientUserId(Long id, Long patientUserId);
}
