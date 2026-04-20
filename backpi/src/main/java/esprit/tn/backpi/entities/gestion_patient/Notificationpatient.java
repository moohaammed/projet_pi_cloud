package esprit.tn.backpi.entities.gestion_patient;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity(name = "PatientNotification")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Notificationpatient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 500)
    private String message;

    @Column(name = "created_at")
    private java.time.LocalDateTime createdAt;

    @Column(name = "lu")
    @com.fasterxml.jackson.annotation.JsonProperty("isRead")
    private boolean isRead = false;

    @Column(length = 50)
    private String type;

    @ManyToOne
    @JoinColumn(name = "patient_id")
    private Patient patient;

    @PrePersist
    protected void onCreate() {
        createdAt = java.time.LocalDateTime.now();
    }
}





