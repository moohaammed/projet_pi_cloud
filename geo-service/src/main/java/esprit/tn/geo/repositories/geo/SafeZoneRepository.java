package esprit.tn.geo.repositories.geo;

import esprit.tn.geo.entities.geo.SafeZone;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface SafeZoneRepository extends MongoRepository<SafeZone, String> {
    List<SafeZone> findByPatientId(Long patientId);
    List<SafeZone> findByDoctorId(Long doctorId);
    List<SafeZone> findByPatientIdAndActifTrue(Long patientId);
}
