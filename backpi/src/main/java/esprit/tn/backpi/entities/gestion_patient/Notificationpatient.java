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

        private String message;
        private LocalDate date;
        private boolean lu;

        @ManyToOne
        @JoinColumn(name = "patient_id")
        private Patient patient;
    }





