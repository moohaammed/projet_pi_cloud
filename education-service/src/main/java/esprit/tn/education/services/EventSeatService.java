package esprit.tn.education.services;

import esprit.tn.education.entities.Event;
import esprit.tn.education.entities.EventSeat;
import esprit.tn.education.entities.SeatStatus;
import esprit.tn.education.exception.ResourceNotFoundException;
import esprit.tn.education.repositories.EventRepository;
import esprit.tn.education.repositories.EventSeatRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.stream.Collectors;
import esprit.tn.education.dto.UserDTO;
import java.util.ArrayList;
import java.util.List;

@Service
public class EventSeatService {

    @Autowired
    private EventSeatRepository seatRepository;

    @Autowired
    private EventRepository eventRepository;

    public void generateSeats(Event event) {
        if (event.getCapacity() == null || event.getCapacity() <= 0) return;
        
        // Clean up existing seats if regenerating
        seatRepository.deleteByEventId(event.getId());

        List<EventSeat> seats = new ArrayList<>();
        for (int i = 1; i <= event.getCapacity(); i++) {
            seats.add(new EventSeat(event.getId(), String.valueOf(i)));
        }
        seatRepository.saveAll(seats);
    }

    public List<EventSeat> getSeatsByEvent(String eventId) {
        List<EventSeat> seats = seatRepository.findByEventIdOrderBySeatNumber(eventId);
        
        if (seats.isEmpty()) {
            Event event = eventRepository.findById(eventId).orElse(null);
            if (event != null && event.getCapacity() != null && event.getCapacity() > 0) {
                generateSeats(event);
                return seatRepository.findByEventIdOrderBySeatNumber(eventId);
            }
        }
        
        return seats;
    }

    @Autowired
    private QrEmailService qrEmailService;

    @Autowired
    private org.springframework.web.reactive.function.client.WebClient.Builder webClientBuilder;

    public EventSeat bookSeat(String seatId, Long userId) {
        EventSeat seat = seatRepository.findById(seatId)
                .orElseThrow(() -> new ResourceNotFoundException("Siège introuvable"));

        if (seat.getStatus() == SeatStatus.BOOKED) {
            throw new RuntimeException("Ce siège est déjà réservé");
        }

        seat.setStatus(SeatStatus.BOOKED);
        seat.setBookedByUserId(userId);
        seat.setBookedAt(LocalDateTime.now());
        seatRepository.save(seat);

        Event event = eventRepository.findById(seat.getEventId()).orElse(null);
        if (event != null && event.getAvailablePlaces() > 0) {
            event.setAvailablePlaces(event.getAvailablePlaces() - 1);
            eventRepository.save(event);
        }

        // Fetch user from monolith backpi (port 8082) and send email
        try {
            esprit.tn.education.dto.UserDTO user = webClientBuilder.build()
                .get()
                .uri("http://localhost:8082/api/users/" + userId)
                .retrieve()
                .bodyToMono(esprit.tn.education.dto.UserDTO.class)
                .block();

            if (user != null && user.getEmail() != null) {
                String fullName = (user.getPrenom() != null ? user.getPrenom() : "") + " " + 
                                  (user.getNom() != null ? user.getNom() : "");
                String eventName = event != null ? event.getTitle() : "Événement inconnu";
                qrEmailService.sendBookingConfirmationEmail(user.getEmail(), fullName.trim(), eventName, seat.getSeatNumber(), 1);
            }
        } catch (Exception e) {
            System.err.println("Erreur lors de la récupération de l'utilisateur ou l'envoi du mail : " + e.getMessage());
        }

        return seat;
    }

    public List<EventSeat> bookMultipleSeats(List<String> seatIds, Long userId) {
        List<EventSeat> bookedSeats = new ArrayList<>();
        Event event = null;

        for (String seatId : seatIds) {
            EventSeat seat = seatRepository.findById(seatId)
                    .orElseThrow(() -> new ResourceNotFoundException("Siège introuvable"));

            if (seat.getStatus() == SeatStatus.BOOKED) {
                throw new RuntimeException("Le siège " + seat.getSeatNumber() + " est déjà réservé");
            }

            seat.setStatus(SeatStatus.BOOKED);
            seat.setBookedByUserId(userId);
            seat.setBookedAt(LocalDateTime.now());
            bookedSeats.add(seat);
            
            if (event == null) {
                event = eventRepository.findById(seat.getEventId()).orElse(null);
            }
        }

        seatRepository.saveAll(bookedSeats);

        if (event != null && event.getAvailablePlaces() >= bookedSeats.size()) {
            event.setAvailablePlaces(event.getAvailablePlaces() - bookedSeats.size());
            eventRepository.save(event);
        }

        // Fetch user from monolith backpi (port 8082) and send email
        try {
            esprit.tn.education.dto.UserDTO user = webClientBuilder.build()
                .get()
                .uri("http://localhost:8082/api/users/" + userId)
                .retrieve()
                .bodyToMono(esprit.tn.education.dto.UserDTO.class)
                .block();

            if (user != null && user.getEmail() != null) {
                String fullName = (user.getPrenom() != null ? user.getPrenom() : "") + " " + 
                                  (user.getNom() != null ? user.getNom() : "");
                String eventName = event != null ? event.getTitle() : "Événement inconnu";
                
                List<String> seatNumbers = bookedSeats.stream().map(EventSeat::getSeatNumber).toList();
                String seatsString = String.join(", ", seatNumbers);

                qrEmailService.sendBookingConfirmationEmail(user.getEmail(), fullName.trim(), eventName, seatsString, bookedSeats.size());
            }
        } catch (Exception e) {
            System.err.println("Erreur lors de la récupération de l'utilisateur ou l'envoi du mail : " + e.getMessage());
        }

        return bookedSeats;
    }

    public void cancelBooking(String seatId, Long userId) {
        EventSeat seat = seatRepository.findById(seatId)
                .orElseThrow(() -> new ResourceNotFoundException("Siège introuvable"));

        if (seat.getStatus() != SeatStatus.BOOKED || seat.getBookedByUserId() == null || 
            !seat.getBookedByUserId().equals(userId)) {
            throw new RuntimeException("Vous ne pouvez pas annuler cette réservation");
        }

        seat.setStatus(SeatStatus.FREE);
        seat.setBookedByUserId(null);
        seat.setBookedAt(null);
        seatRepository.save(seat);

        Event event = eventRepository.findById(seat.getEventId()).orElse(null);
        if (event != null) {
            Integer currentAvailable = event.getAvailablePlaces();
            if (currentAvailable == null) currentAvailable = 0;
            event.setAvailablePlaces(currentAvailable + 1);
            eventRepository.save(event);
        }
    }

    public void cancelMultipleBookings(List<String> seatIds, Long userId) {
        List<EventSeat> seatsToCancel = new ArrayList<>();
        Event event = null;

        for (String seatId : seatIds) {
            EventSeat seat = seatRepository.findById(seatId)
                    .orElseThrow(() -> new ResourceNotFoundException("Siège introuvable"));

            if (seat.getStatus() != SeatStatus.BOOKED || seat.getBookedByUserId() == null || 
                !seat.getBookedByUserId().equals(userId)) {
                throw new RuntimeException("Vous ne pouvez pas annuler la réservation du siège " + seat.getSeatNumber());
            }

            seat.setStatus(SeatStatus.FREE);
            seat.setBookedByUserId(null);
            seat.setBookedAt(null);
            seatsToCancel.add(seat);

            if (event == null) {
                event = eventRepository.findById(seat.getEventId()).orElse(null);
            }
        }

        seatRepository.saveAll(seatsToCancel);

        if (event != null) {
            Integer currentAvailable = event.getAvailablePlaces();
            if (currentAvailable == null) currentAvailable = 0;
            event.setAvailablePlaces(currentAvailable + seatsToCancel.size());
            eventRepository.save(event);
        }
    }

    public List<UserDTO> getAttendeesByEvent(String eventId) {
        List<EventSeat> bookedSeats = seatRepository.findByEventIdOrderBySeatNumber(eventId).stream()
                .filter(s -> s.getStatus() == SeatStatus.BOOKED && s.getBookedByUserId() != null)
                .collect(Collectors.toList());

        List<Long> userIds = bookedSeats.stream()
                .map(EventSeat::getBookedByUserId)
                .distinct()
                .collect(Collectors.toList());

        if (userIds.isEmpty()) {
            return new ArrayList<>();
        }

        try {
            // Call batch endpoint in backpi
            String idsParam = userIds.stream().map(String::valueOf).collect(Collectors.joining(","));
            UserDTO[] users = webClientBuilder.build()
                    .get()
                    .uri("http://localhost:8082/api/users/batch?ids=" + idsParam)
                    .retrieve()
                    .bodyToMono(UserDTO[].class)
                    .block();

            return users != null ? List.of(users) : new ArrayList<>();
        } catch (Exception e) {
            System.err.println("Erreur lors de la récupération des participants : " + e.getMessage());
            return new ArrayList<>();
        }
    }
}
