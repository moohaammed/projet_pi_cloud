package esprit.tn.backpi.services.education;

import esprit.tn.backpi.entities.education.Event;
import esprit.tn.backpi.entities.education.EventSeat;
import esprit.tn.backpi.entities.education.SeatStatus;
import esprit.tn.backpi.entity.User;
import esprit.tn.backpi.repositories.education.EventRepository;
import esprit.tn.backpi.repositories.education.EventSeatRepository;
import esprit.tn.backpi.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class EventSeatService {

    @Autowired
    private EventSeatRepository seatRepository;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Génère les sièges pour un événement si sa capacité est définie.
     */
    @Transactional
    public void generateSeats(Event event) {
        if (event.getCapacity() == null || event.getCapacity() <= 0) return;
        
        // Vérifier si des sièges existent déjà pour éviter les doublons
        if (!seatRepository.findByEventIdOrderBySeatNumber(event.getId()).isEmpty()) {
            return;
        }

        List<EventSeat> seats = new ArrayList<>();
        for (int i = 1; i <= event.getCapacity(); i++) {
            seats.add(new EventSeat(event, String.valueOf(i)));
        }
        seatRepository.saveAll(seats);
    }

    public List<EventSeat> getSeatsByEvent(Long eventId) {
        List<EventSeat> seats = seatRepository.findByEventIdOrderBySeatNumber(eventId);
        
        // Auto-génération si la liste est vide mais que l'événement a une capacité
        if (seats.isEmpty()) {
            Event event = eventRepository.findById(eventId).orElse(null);
            if (event != null && event.getCapacity() != null && event.getCapacity() > 0) {
                generateSeats(event);
                return seatRepository.findByEventIdOrderBySeatNumber(eventId);
            }
        }
        
        return seats;
    }

    /**
     * Réserve un siège de manière transactionnelle avec verrouillage pessimiste.
     */
    @Transactional
    public EventSeat bookSeat(Long seatId, Long userId) {
        // 1. Verrouillage du siège pour éviter les accès concurrents
        EventSeat seat = seatRepository.findWithLockById(seatId)
                .orElseThrow(() -> new RuntimeException("Siège introuvable"));

        if (seat.getStatus() == SeatStatus.BOOKED) {
            throw new RuntimeException("Ce siège est déjà réservé");
        }

        // 2. (Supprimé) : L'utilisateur peut désormais réserver plusieurs places.

        // 3. Récupérer l'utilisateur
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        // 4. Mettre à jour le siège
        seat.setStatus(SeatStatus.BOOKED);
        seat.setBookedBy(user);
        seat.setBookedAt(LocalDateTime.now());
        seatRepository.save(seat);

        // 5. Mettre à jour le compteur de l'événement
        Event event = seat.getEvent();
        if (event.getAvailablePlaces() > 0) {
            event.setAvailablePlaces(event.getAvailablePlaces() - 1);
            eventRepository.save(event);
        }

        return seat;
    }

    /**
     * Annule une réservation de siège.
     */
    @Transactional
    public void cancelBooking(Long seatId, Long userId) {
        // 1. Verrouillage du siège
        EventSeat seat = seatRepository.findWithLockById(seatId)
                .orElseThrow(() -> new RuntimeException("Siège introuvable"));

        // 2. Vérifier que c'est bien l'utilisateur qui a réservé ce siège (ID robuste)
        if (seat.getStatus() != SeatStatus.BOOKED || seat.getBookedBy() == null || 
            seat.getBookedBy().getId().longValue() != userId.longValue()) {
            throw new RuntimeException("Vous ne pouvez pas annuler cette réservation");
        }

        // 3. Libérer le siège
        seat.setStatus(SeatStatus.FREE);
        seat.setBookedBy(null);
        seat.setBookedAt(null);
        seatRepository.save(seat);

        // 4. Mettre à jour le compteur de l'événement
        Event event = seat.getEvent();
        if (event != null) {
            Integer currentAvailable = event.getAvailablePlaces();
            if (currentAvailable == null) currentAvailable = 0;
            event.setAvailablePlaces(currentAvailable + 1);
            eventRepository.save(event);
        }
    }
}
