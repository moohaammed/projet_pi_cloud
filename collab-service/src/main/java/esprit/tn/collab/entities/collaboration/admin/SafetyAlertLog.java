package esprit.tn.collab.entities.collaboration.admin;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;

@Document(collection = "safety_alert_logs")
public class SafetyAlertLog {

    
    @Id
    private String id;

    
    private Long patientId;

    
    private SafetyAlertType alertType;

    
    private SafetyAlertStatus status = SafetyAlertStatus.OPEN;

    
    private Instant createdAt = Instant.now();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public Long getPatientId() { return patientId; }
    public void setPatientId(Long patientId) { this.patientId = patientId; }
    public SafetyAlertType getAlertType() { return alertType; }
    public void setAlertType(SafetyAlertType alertType) { this.alertType = alertType; }
    public SafetyAlertStatus getStatus() { return status; }
    public void setStatus(SafetyAlertStatus status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
