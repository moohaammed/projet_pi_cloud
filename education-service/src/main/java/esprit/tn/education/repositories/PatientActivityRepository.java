package esprit.tn.education.repositories;

import esprit.tn.education.entities.Activity;
import esprit.tn.education.entities.PatientActivity;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface PatientActivityRepository extends MongoRepository<PatientActivity, String> {
    Optional<PatientActivity> findFirstByUserIdOrderByPlayedAtDesc(Long userId);
    Optional<PatientActivity> findFirstByUserIdAndActivityTypeOrderByPlayedAtDesc(Long userId, Activity.ActivityType type);
    List<PatientActivity> findAllByUserIdOrderByPlayedAtDesc(Long userId);
    List<PatientActivity> findAllByUserIdAndActivityTypeAndReussiTrue(Long userId, Activity.ActivityType type);
    void deleteByUserId(Long userId);
    void deleteByUserIdAndActivityType(Long userId, Activity.ActivityType type);
}
