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
@Document(collection = "patient_activities")
public class PatientActivity {

    @Id
    private String id;

    private Long userId;         // Reference to User in backpi

    private String activityId;   // Reference to Activity in this service
    
    private Activity.ActivityType activityType; // Denormalized for easier querying

    private Long scoreCumule = 0L;
    private Long scoreSession = 0L;

    private Integer bonnesReponses = 0;
    private Integer mauvaisesReponses = 0;

    private Boolean reussi = false;

    private Activity.Stade currentStade = Activity.Stade.LEGER;

    private Integer dureeSecondes = 0;

    private LocalDateTime playedAt = LocalDateTime.now();
}
