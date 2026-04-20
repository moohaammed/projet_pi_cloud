package esprit.tn.geo.repositories.geo;

import esprit.tn.geo.entities.geo.GeoAlert;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface GeoAlertRepository extends MongoRepository<GeoAlert, String> {
    List<GeoAlert> findByPatientIdOrderByDeclencheeAtDesc(Long patientId);
    List<GeoAlert> findByResolue(boolean resolue);
    List<GeoAlert> findByPatientIdAndResolue(Long patientId, boolean resolue);
}
