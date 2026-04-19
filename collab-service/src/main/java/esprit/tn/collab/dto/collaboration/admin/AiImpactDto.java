package esprit.tn.collab.dto.collaboration.admin;

public class AiImpactDto {
    private long totalMessages;
    private long summariesGenerated;
    private long summariesViewed;

    public long getTotalMessages() { return totalMessages; }
    public void setTotalMessages(long totalMessages) { this.totalMessages = totalMessages; }
    public long getSummariesGenerated() { return summariesGenerated; }
    public void setSummariesGenerated(long summariesGenerated) { this.summariesGenerated = summariesGenerated; }
    public long getSummariesViewed() { return summariesViewed; }
    public void setSummariesViewed(long summariesViewed) { this.summariesViewed = summariesViewed; }
}
