package esprit.tn.education.repositories;

import esprit.tn.education.entities.Activity;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface ActivityRepository extends MongoRepository<Activity, String> {
    List<Activity> findByType(Activity.ActivityType type);
    List<Activity> findByStade(Activity.Stade stade);
    List<Activity> findByTypeAndStade(Activity.ActivityType type, Activity.Stade stade);
    List<Activity> findByActiveTrue();
    List<Activity> findByActiveTrueAndStade(Activity.Stade stade);
}
