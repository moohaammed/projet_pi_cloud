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
@Document(collection = "events")
public class Event {

    @Id
    private String id;

    private String title;

    private LocalDateTime startDateTime;

    private String location;

    private String description;

    private Boolean remindEnabled = false;

    private Long userId;         // Reference to User in backpi

    private String activityId;   // Reference to Activity in this service

    private String imageUrl;     
    
    private Integer capacity = 0;
    
    private Integer availablePlaces = 0;

    private LocalDateTime createdAt = LocalDateTime.now();
}
