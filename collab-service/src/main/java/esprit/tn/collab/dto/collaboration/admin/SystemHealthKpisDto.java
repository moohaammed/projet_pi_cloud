package esprit.tn.collab.dto.collaboration.admin;

public class SystemHealthKpisDto {
    private long unresolvedSafetyAlerts;
    private long pendingModeration;

    public long getUnresolvedSafetyAlerts() { return unresolvedSafetyAlerts; }
    public void setUnresolvedSafetyAlerts(long v) { this.unresolvedSafetyAlerts = v; }
    public long getPendingModeration() { return pendingModeration; }
    public void setPendingModeration(long v) { this.pendingModeration = v; }
}
