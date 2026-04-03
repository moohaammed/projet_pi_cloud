package esprit.tn.backpi.dto.collaboration;

import java.util.List;

public class HandoverDTO {

    private String summary;
    private List<String> criticalAlerts;
    private List<String> pendingTasks;
    private double averageSentiment;
    private int totalMessages;
    private int totalPublications;
    private int pollCount;

    public HandoverDTO() {}

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public List<String> getCriticalAlerts() { return criticalAlerts; }
    public void setCriticalAlerts(List<String> criticalAlerts) { this.criticalAlerts = criticalAlerts; }

    public List<String> getPendingTasks() { return pendingTasks; }
    public void setPendingTasks(List<String> pendingTasks) { this.pendingTasks = pendingTasks; }

    public double getAverageSentiment() { return averageSentiment; }
    public void setAverageSentiment(double averageSentiment) { this.averageSentiment = averageSentiment; }

    public int getTotalMessages() { return totalMessages; }
    public void setTotalMessages(int totalMessages) { this.totalMessages = totalMessages; }

    public int getTotalPublications() { return totalPublications; }
    public void setTotalPublications(int totalPublications) { this.totalPublications = totalPublications; }

    public int getPollCount() { return pollCount; }
    public void setPollCount(int pollCount) { this.pollCount = pollCount; }
}
