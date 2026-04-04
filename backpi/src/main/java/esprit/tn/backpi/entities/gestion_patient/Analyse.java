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

    // Manual Getters and Setters to bypass potential Lombok issues
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    
    public String getStatut() { return statut; }
    public void setStatut(String statut) { this.statut = statut; }
    
    public String getRapportMedical() { return rapportMedical; }
    public void setRapportMedical(String rapportMedical) { this.rapportMedical = rapportMedical; }
    
    public String getImageIRM() { return imageIRM; }
    public void setImageIRM(String imageIRM) { this.imageIRM = imageIRM; }
    
    public Double getScoreJeu() { return scoreJeu; }
    public void setScoreJeu(Double scoreJeu) { this.scoreJeu = scoreJeu; }
    
    public Double getPourcentageRisque() { return pourcentageRisque; }
    public void setPourcentageRisque(Double pourcentageRisque) { this.pourcentageRisque = pourcentageRisque; }
    
    public String getInterpretation() { return interpretation; }
    public void setInterpretation(String interpretation) { this.interpretation = interpretation; }
    
    public String getObservationMedicale() { return observationMedicale; }
    public void setObservationMedicale(String observationMedicale) { this.observationMedicale = observationMedicale; }
    
    public Patient getPatient() { return patient; }
    public void setPatient(Patient patient) { this.patient = patient; }
    
    public JeuCognitif getJeuCognitif() { return jeuCognitif; }
    public void setJeuCognitif(JeuCognitif jeuCognitif) { this.jeuCognitif = jeuCognitif; }
}
