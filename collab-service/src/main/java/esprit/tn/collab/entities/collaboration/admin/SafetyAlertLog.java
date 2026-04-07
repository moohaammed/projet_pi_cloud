package esprit.tn.collab.entities.collaboration.admin;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "safety_alert_logs")
public class SafetyAlertLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** userId only — no JPA join to User */
    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 64)
    private SafetyAlertType alertType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 64)
    private SafetyAlertStatus status = SafetyAlertStatus.OPEN;

    private Instant createdAt = Instant.now();
    private Long relatedMessageId;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getPatientId() { return patientId; }
    public void setPatientId(Long patientId) { this.patientId = patientId; }
    public SafetyAlertType getAlertType() { return alertType; }
    public void setAlertType(SafetyAlertType alertType) { this.alertType = alertType; }
    public SafetyAlertStatus getStatus() { return status; }
    public void setStatus(SafetyAlertStatus status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Long getRelatedMessageId() { return relatedMessageId; }
    public void setRelatedMessageId(Long relatedMessageId) { this.relatedMessageId = relatedMessageId; }
}
