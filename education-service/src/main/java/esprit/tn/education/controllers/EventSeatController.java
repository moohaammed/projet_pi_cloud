package esprit.tn.education.controllers;

import esprit.tn.education.entities.EventSeat;
import esprit.tn.education.services.EventSeatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/event-seats")
public class EventSeatController {

    @Autowired
    private EventSeatService seatService;

    @GetMapping("/event/{eventId}")
    public ResponseEntity<List<EventSeat>> getSeatsByEvent(@PathVariable String eventId) {
        return ResponseEntity.ok(seatService.getSeatsByEvent(eventId));
    }

    @PostMapping("/{seatId}/book")
    public ResponseEntity<?> bookSeat(@PathVariable String seatId, @RequestParam Long userId) {
        try {
            EventSeat bookedSeat = seatService.bookSeat(seatId, userId);
            return ResponseEntity.ok(bookedSeat);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/book-multiple")
    public ResponseEntity<?> bookMultipleSeats(@RequestParam Long userId, @RequestBody List<String> seatIds) {
        try {
            List<EventSeat> bookedSeats = seatService.bookMultipleSeats(seatIds, userId);
            return ResponseEntity.ok(bookedSeats);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{seatId}/cancel")
    public ResponseEntity<?> cancelBooking(@PathVariable String seatId, @RequestParam Long userId) {
        try {
            seatService.cancelBooking(seatId, userId);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/cancel-multiple")
    public ResponseEntity<?> cancelMultipleBookings(@RequestParam Long userId, @RequestBody List<String> seatIds) {
        try {
            seatService.cancelMultipleBookings(seatIds, userId);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/event/{eventId}/attendees")
    public ResponseEntity<List<esprit.tn.education.dto.UserDTO>> getAttendeesByEvent(@PathVariable String eventId) {
        return ResponseEntity.ok(seatService.getAttendeesByEvent(eventId));
    }
}
