package esprit.tn.education.repositories;

import esprit.tn.education.entities.AudioSession;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AudioSessionRepository extends MongoRepository<AudioSession, String> {

    List<AudioSession> findByActivityId(String activityId);

    List<AudioSession> findByPatientId(String patientId);

    List<AudioSession> findByActivityIdAndPatientId(String activityId, String patientId);
}
