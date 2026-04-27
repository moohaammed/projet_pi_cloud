package esprit.tn.backpi.repository;

import esprit.tn.backpi.entity.PatientContact;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PatientContactRepository extends JpaRepository<PatientContact, Long> {

    List<PatientContact> findByPatientUserId(Long patientUserId);

    Optional<PatientContact> findByIdAndPatientUserId(Long id, Long patientUserId);
}
