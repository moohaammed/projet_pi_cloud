package esprit.tn.geo.repositories.geo;

import esprit.tn.geo.entities.geo.Incident;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IncidentRepository extends MongoRepository<Incident, String> {

    /** Tous les incidents d'un patient donné, du plus récent au plus ancien. */
    List<Incident> findByPatientIdOrderByCreatedAtDesc(Long patientId);

    /** Tous les incidents signalés par un reporter donné. */
    List<Incident> findByReporterIdOrderByCreatedAtDesc(Long reporterId);

    /** Tous les incidents triés par date décroissante. */
    List<Incident> findAllByOrderByCreatedAtDesc();
}
