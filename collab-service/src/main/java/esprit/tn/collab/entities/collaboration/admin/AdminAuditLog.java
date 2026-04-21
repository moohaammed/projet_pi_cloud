package esprit.tn.collab.entities.collaboration.admin;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;

@Document(collection = "admin_audit_logs")
public class AdminAuditLog {
    @Id
    private String id;
    private Long adminId;
    private String action;       // e.g. "DELETE_POST", "DELETE_MESSAGE", "SUSPEND_USER"
    private String targetId;     // ID of the affected resource
    private String targetType;   // "POST", "MESSAGE", "USER"
    private String details;      // brief description
    private Instant performedAt = Instant.now();

    public AdminAuditLog() {}
    public AdminAuditLog(Long adminId, String action, String targetId, String targetType, String details) {
        this.adminId = adminId; this.action = action; this.targetId = targetId;
        this.targetType = targetType; this.details = details;
    }

    public String getId() { return id; }
    public Long getAdminId() { return adminId; }
    public String getAction() { return action; }
    public String getTargetId() { return targetId; }
    public String getTargetType() { return targetType; }
    public String getDetails() { return details; }
    public Instant getPerformedAt() { return performedAt; }
    public void setPerformedAt(Instant t) { this.performedAt = t; }
}
