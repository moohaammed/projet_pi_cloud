package esprit.tn.backpi.repository;

import esprit.tn.backpi.entity.PatientLocation;
import esprit.tn.backpi.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PatientLocationRepository extends JpaRepository<PatientLocation, Long> {
    List<PatientLocation> findByPatientOrderByTimestampDesc(User patient);
    Optional<PatientLocation> findTopByPatientOrderByTimestampDesc(User patient);
    List<PatientLocation> findByPatient_Id(Long patientId);
}