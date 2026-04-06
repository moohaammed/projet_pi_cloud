package esprit.tn.backpi.entities.collaboration.admin;

import esprit.tn.backpi.entity.User;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "safety_alert_logs")
public class SafetyAlertLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "patient_id")
    private User patient;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 64)
    private SafetyAlertType alertType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 64)
    private SafetyAlertStatus status = SafetyAlertStatus.OPEN;

    private Instant createdAt = Instant.now();

    /** Message id for audit only — never expose body to admin APIs */
    private Long relatedMessageId;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getPatient() { return patient; }
    public void setPatient(User patient) { this.patient = patient; }
    public SafetyAlertType getAlertType() { return alertType; }
    public void setAlertType(SafetyAlertType alertType) { this.alertType = alertType; }
    public SafetyAlertStatus getStatus() { return status; }
    public void setStatus(SafetyAlertStatus status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Long getRelatedMessageId() { return relatedMessageId; }
    public void setRelatedMessageId(Long relatedMessageId) { this.relatedMessageId = relatedMessageId; }
}
