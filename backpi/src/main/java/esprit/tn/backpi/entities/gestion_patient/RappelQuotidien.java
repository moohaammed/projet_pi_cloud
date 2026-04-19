package esprit.tn.backpi.entities.gestion_patient;

import jakarta.persistence.*;
import lombok.*;
import esprit.tn.backpi.entity.User;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "rappel_quotidien")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RappelQuotidien {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @Column(nullable = false)
    private String titre;

    @Column(length = 500)
    private String description;

    @Column(name = "heure_rappel", nullable = false)
    private LocalTime heureRappel;

    @Column(length = 100)
    private String jours = "TOUS";

    @Enumerated(EnumType.STRING)
    private TypeRappel type = TypeRappel.AUTRE;

    private boolean actif = true;

    @ManyToOne
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum TypeRappel {
        MEDICAMENT, REPAS, HYGIENE, EXERCICE, SOCIAL, AUTRE
    }
}
