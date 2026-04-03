package esprit.tn.backpi.entities.gestion_patient;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Analyse {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDate date;
    private String statut;

    @com.fasterxml.jackson.annotation.JsonProperty("rapportMedical")
    @com.fasterxml.jackson.annotation.JsonAlias({"rapport_medical", "rapportMedical"})
    @Column(name = "rapport_medical", columnDefinition = "LONGTEXT")
    private String rapportMedical;

    @com.fasterxml.jackson.annotation.JsonProperty("imageIRM")
    @com.fasterxml.jackson.annotation.JsonAlias({"image_irm", "imageIRM", "imageIrm", "imageirm"})
    @Column(name = "image_irm", columnDefinition = "LONGTEXT")
    private String imageIRM;

    @Column(name = "score_jeu", nullable = true)
    private Double scoreJeu;

    @Column(name = "pourcentage_risque")
    private Double pourcentageRisque;

    private String interpretation;

    @Column(name = "observation_medicale")
    private String observationMedicale;

    @ManyToOne
    @JoinColumn(name = "patient_id")
    private Patient patient;

    @ManyToOne
    @JoinColumn(name = "jeu_cognitif_id", nullable = true)
    private JeuCognitif jeuCognitif;
}
