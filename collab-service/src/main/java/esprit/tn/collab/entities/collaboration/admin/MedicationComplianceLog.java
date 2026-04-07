package esprit.tn.collab.entities.collaboration.admin;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "medication_compliance_logs")
public class MedicationComplianceLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** userId only — no JPA join to User */
    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(nullable = false)
    private boolean tookMedication;

    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getPatientId() { return patientId; }
    public void setPatientId(Long patientId) { this.patientId = patientId; }
    public boolean isTookMedication() { return tookMedication; }
    public void setTookMedication(boolean tookMedication) { this.tookMedication = tookMedication; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
