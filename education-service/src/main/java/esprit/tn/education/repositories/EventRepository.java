package esprit.tn.education.repositories;

import esprit.tn.education.entities.Event;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface EventRepository extends MongoRepository<Event, String> {
    List<Event> findByUserId(Long userId);
    List<Event> findByActivityId(String activityId);
    List<Event> findByRemindEnabledTrue();
}
