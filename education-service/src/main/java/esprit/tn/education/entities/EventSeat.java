package esprit.tn.education.entities;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "event_seats")
public class EventSeat {

    @Id
    private String id;

    private String eventId;     // Reference to Event in this service

    private String seatNumber;

    private SeatStatus status = SeatStatus.FREE;

    private Long bookedByUserId; // Reference to User in backpi

    private LocalDateTime bookedAt;

    public EventSeat(String eventId, String seatNumber) {
        this.eventId = eventId;
        this.seatNumber = seatNumber;
        this.status = SeatStatus.FREE;
    }
}
