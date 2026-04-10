package esprit.tn.backpi.repositories.education;

import esprit.tn.backpi.entities.education.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EventRepository extends JpaRepository<Event, Long> {
    List<Event> findByUserId(Long userId);
    List<Event> findByRemindEnabledTrue();
}
