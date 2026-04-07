package esprit.tn.backpi.repositories.education;

import esprit.tn.backpi.entities.education.EventSeat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;

public interface EventSeatRepository extends JpaRepository<EventSeat, Long> {
    
    List<EventSeat> findByEventIdOrderBySeatNumber(Long eventId);
    
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<EventSeat> findWithLockById(Long id);
    
    boolean existsByEventIdAndBookedById(Long eventId, Long userId);
}
