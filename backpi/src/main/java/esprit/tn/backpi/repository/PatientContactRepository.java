package esprit.tn.backpi.repository;

import esprit.tn.backpi.entity.PatientContact;
import esprit.tn.backpi.entity.RelationType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PatientContactRepository extends JpaRepository<PatientContact, Long> {

    List<PatientContact> findByPatientUserId(Long patientUserId);

    List<PatientContact> findByContactUserId(Long contactUserId);

    List<PatientContact> findByRelationTypeAndContactUserId(RelationType relationType, Long contactUserId);

    List<PatientContact> findByEmailIgnoreCase(String email);

    Optional<PatientContact> findByIdAndPatientUserId(Long id, Long patientUserId);
}
