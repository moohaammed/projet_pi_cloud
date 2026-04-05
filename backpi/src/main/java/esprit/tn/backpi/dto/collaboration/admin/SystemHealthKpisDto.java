package esprit.tn.backpi.dto.collaboration.admin;

public class SystemHealthKpisDto {

    private long unresolvedSafetyAlerts;
    private long pendingModeration;

    public long getUnresolvedSafetyAlerts() { return unresolvedSafetyAlerts; }
    public void setUnresolvedSafetyAlerts(long unresolvedSafetyAlerts) { this.unresolvedSafetyAlerts = unresolvedSafetyAlerts; }
    public long getPendingModeration() { return pendingModeration; }
    public void setPendingModeration(long pendingModeration) { this.pendingModeration = pendingModeration; }
}
