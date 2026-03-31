package esprit.tn.backpi.entity;
import jakarta.persistence.*;
import lombok.*;
import java.util.Date;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RendezVous {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // On stocke juste les IDs (pas les objets Patient/Medecin)
    private Long patientId;
    private Long medecinId;

    @Temporal(TemporalType.TIMESTAMP)
    private Date dateHeure;

    private String motif;
    private String observations;

    @Enumerated(EnumType.STRING)
    private StatutRendezVous statut;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setPatientId(Long patientId) {
        this.patientId = patientId;
    }

    public void setMedecinId(Long medecinId) {
        this.medecinId = medecinId;
    }

    public void setDateHeure(Date dateHeure) {
        this.dateHeure = dateHeure;
    }

    public void setMotif(String motif) {
        this.motif = motif;
    }

    public void setObservations(String observations) {
        this.observations = observations;
    }

    public void setStatut(StatutRendezVous statut) {
        this.statut = statut;
    }

    public Long getPatientId() {
        return patientId;
    }

    public Long getMedecinId() {
        return medecinId;
    }

    public Date getDateHeure() {
        return dateHeure;
    }

    public String getMotif() {
        return motif;
    }

    public String getObservations() {
        return observations;
    }

    public StatutRendezVous getStatut() {
        return statut;
    }

    @PrePersist
    public void prePersist() {
        if (this.statut == null) {
            this.statut = StatutRendezVous.PLANIFIE;
        }
    }
}