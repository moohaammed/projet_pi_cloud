package esprit.tn.backpi.entities.education;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "activities")
public class Activity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    @Enumerated(EnumType.STRING)
    private ActivityType type;  // QUIZ, GAME, CONTENT, EXERCICE

    @Enumerated(EnumType.STRING)
    private Stade stade;        // LEGER, MODERE, SEVERE

    private String description;

    @Column(columnDefinition = "JSON")
    private String data;        // JSON selon le type

    private Integer estimatedMinutes = 5;

    private Boolean active = true;

    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }

    public enum ActivityType { QUIZ, GAME, CONTENT, EXERCICE }
    public enum Stade { LEGER, MODERE, SEVERE }

    // Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public ActivityType getType() { return type; }
    public void setType(ActivityType type) { this.type = type; }

    public Stade getStade() { return stade; }
    public void setStade(Stade stade) { this.stade = stade; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getData() { return data; }
    public void setData(String data) { this.data = data; }

    public Integer getEstimatedMinutes() { return estimatedMinutes; }
    public void setEstimatedMinutes(Integer m) { this.estimatedMinutes = m; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime c) { this.createdAt = c; }
}