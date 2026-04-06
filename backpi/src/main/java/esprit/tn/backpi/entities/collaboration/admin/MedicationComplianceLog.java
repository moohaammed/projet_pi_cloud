package esprit.tn.backpi.entities.collaboration.admin;

import esprit.tn.backpi.entity.User;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "medication_compliance_logs")
public class MedicationComplianceLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id")
    private User patient;

    @Column(nullable = false)
    private boolean tookMedication;

    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getPatient() { return patient; }
    public void setPatient(User patient) { this.patient = patient; }
    public boolean isTookMedication() { return tookMedication; }
    public void setTookMedication(boolean tookMedication) { this.tookMedication = tookMedication; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
