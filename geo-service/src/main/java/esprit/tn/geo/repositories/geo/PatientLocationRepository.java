package esprit.tn.geo.repositories.geo;

import esprit.tn.geo.entities.geo.PatientLocation;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface PatientLocationRepository extends MongoRepository<PatientLocation, String> {
    List<PatientLocation> findByPatientIdOrderByTimestampDesc(Long patientId);
    Optional<PatientLocation> findTopByPatientIdOrderByTimestampDesc(Long patientId);
    List<PatientLocation> findByPatientId(Long patientId);
}
