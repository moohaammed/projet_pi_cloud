package esprit.tn.education.repositories;

import esprit.tn.education.entities.EventSeat;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface EventSeatRepository extends MongoRepository<EventSeat, String> {
    List<EventSeat> findByEventIdOrderBySeatNumber(String eventId);
    List<EventSeat> findByBookedByUserId(Long userId);
    void deleteByEventId(String eventId);
}
