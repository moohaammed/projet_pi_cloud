package esprit.tn.backpi.controllers.education;

import esprit.tn.backpi.entities.education.EventSeat;
import esprit.tn.backpi.services.education.EventSeatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/event-seats")
@CrossOrigin(origins = "http://localhost:4200") // Autoriser les requêtes du frontend
public class EventSeatController {

    @Autowired
    private EventSeatService seatService;

    /**
     * Récupère tous les sièges d'un événement.
     */
    @GetMapping("/event/{eventId}")
    public ResponseEntity<List<EventSeat>> getSeatsByEvent(@PathVariable Long eventId) {
        return ResponseEntity.ok(seatService.getSeatsByEvent(eventId));
    }

    /**
     * Réserve un siège spécifique pour un utilisateur donné.
     * Note: Dans un environnement avec JWT, l'userId serait extrait du token.
     */
    @PostMapping("/{seatId}/book")
    public ResponseEntity<?> bookSeat(@PathVariable Long seatId, @RequestParam Long userId) {
        try {
            EventSeat bookedSeat = seatService.bookSeat(seatId, userId);
            return ResponseEntity.ok(bookedSeat);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Annule une réservation de siège.
     */
    @PostMapping("/{seatId}/cancel")
    public ResponseEntity<?> cancelBooking(@PathVariable Long seatId, @RequestParam Long userId) {
        try {
            seatService.cancelBooking(seatId, userId);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
