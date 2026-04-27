package esprit.tn.geo.repositories.geo;

import esprit.tn.geo.entities.geo.HospitalPrediction;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface HospitalPredictionRepository extends MongoRepository<HospitalPrediction, String> {
    Optional<HospitalPrediction> findFirstByPatientIdOrderByCreatedAtDesc(Long patientId);
    List<HospitalPrediction> findTop20ByOrderByCreatedAtDesc();
}
