package esprit.tn.patientmedecin.entities;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDate;

@Document(collection = "analyses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Analyse {

    @Transient
    public static final String SEQUENCE_NAME = "analyses_sequence";

    @Id
    private Long id;

    private LocalDate date;
    private String statut;

    @com.fasterxml.jackson.annotation.JsonProperty("rapportMedical")
    @com.fasterxml.jackson.annotation.JsonAlias({"rapport_medical", "rapportMedical"})
    @Field("rapport_medical")
    private String rapportMedical;

    @com.fasterxml.jackson.annotation.JsonProperty("imageIRM")
    @com.fasterxml.jackson.annotation.JsonAlias({"image_irm", "imageIRM", "imageIrm", "imageirm"})
    @Field("image_irm")
    private String imageIRM;

    @Field("score_jeu")
    private Double scoreJeu;

    @Field("pourcentage_risque")
    private Double pourcentageRisque;

    private String interpretation;

    @Field("observation_medicale")
    private String observationMedicale;

    @DBRef
    private Patient patient;

    @DBRef
    private JeuCognitif jeuCognitif;

    // Manual Getters and Setters
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
