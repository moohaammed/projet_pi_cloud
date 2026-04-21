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
@Document(collection = "activities")
public class Activity {

    @Id
    private String id;

    private String title;

    private ActivityType type;  // QUIZ, GAME, CONTENT, EXERCICE

    private Stade stade;        // LEGER, MODERE, SEVERE

    private String description;

    private String data;        // JSON string stored as is

    private Integer estimatedMinutes = 5;

    private Boolean active = true;

    private LocalDateTime createdAt = LocalDateTime.now();

    public enum ActivityType { QUIZ, GAME, CONTENT, EXERCICE }
    public enum Stade { LEGER, MODERE, SEVERE }
}
