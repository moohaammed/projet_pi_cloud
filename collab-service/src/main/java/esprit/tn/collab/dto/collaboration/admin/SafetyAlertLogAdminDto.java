package esprit.tn.collab.dto.collaboration.admin;

import esprit.tn.collab.entities.collaboration.admin.SafetyAlertStatus;
import esprit.tn.collab.entities.collaboration.admin.SafetyAlertType;
import java.time.Instant;

public class SafetyAlertLogAdminDto {
    private Long id;
    private String patientName;
    private SafetyAlertType alertType;
    private Instant time;
    private SafetyAlertStatus status;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }
    public SafetyAlertType getAlertType() { return alertType; }
    public void setAlertType(SafetyAlertType alertType) { this.alertType = alertType; }
    public Instant getTime() { return time; }
    public void setTime(Instant time) { this.time = time; }
    public SafetyAlertStatus getStatus() { return status; }
    public void setStatus(SafetyAlertStatus status) { this.status = status; }
}
