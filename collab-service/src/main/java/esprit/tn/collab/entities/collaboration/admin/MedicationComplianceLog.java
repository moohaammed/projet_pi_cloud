package esprit.tn.collab.entities.collaboration.admin;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;

@Document(collection = "medication_compliance_logs")
public class MedicationComplianceLog {

    @Id
    private String id;

    private Long patientId;
    private boolean tookMedication;
    private Instant createdAt = Instant.now();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public Long getPatientId() { return patientId; }
    public void setPatientId(Long patientId) { this.patientId = patientId; }
    public boolean isTookMedication() { return tookMedication; }
    public void setTookMedication(boolean tookMedication) { this.tookMedication = tookMedication; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
