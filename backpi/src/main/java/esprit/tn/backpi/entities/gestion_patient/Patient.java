package esprit.tn.backpi.entities.gestion_patient;

import esprit.tn.backpi.entities.User;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Patient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nom;
    private String prenom;

    // ✅ CORRECTION : int → Integer et double → Double (types wrappers nullable)
    // Problème original : Jackson ne peut pas mapper null dans un primitif int/double
    // → MismatchedInputException quand on envoie { "patient": { "id": 5 } } sans age/poids
    private Integer age;
    private Double poids;

    private String sexe;

    @OneToOne
    @JoinColumn(name = "user_id")
    private User user;
}