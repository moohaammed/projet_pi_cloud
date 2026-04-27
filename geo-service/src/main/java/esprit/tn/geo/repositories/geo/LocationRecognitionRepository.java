package esprit.tn.geo.repositories.geo;

import esprit.tn.geo.entities.geo.LocationRecognition;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LocationRecognitionRepository extends MongoRepository<LocationRecognition, String> {
    Optional<LocationRecognition> findFirstByPatientIdOrderByDateDesc(Long patientId);

    List<LocationRecognition> findTop20ByPatientIdOrderByDateDesc(Long patientId);
}
