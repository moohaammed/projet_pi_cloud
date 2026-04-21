package esprit.tn.collab.dto.collaboration.admin;

import java.util.List;

public class ClinicalPulseDto {

    
    private List<String> topThemes;

    
    private String aiSummary;

    
    private String sentimentVelocity;

    
    private long totalAnalyzed;

    public List<String> getTopThemes() { return topThemes; }
    public void setTopThemes(List<String> topThemes) { this.topThemes = topThemes; }
    public String getAiSummary() { return aiSummary; }
    public void setAiSummary(String aiSummary) { this.aiSummary = aiSummary; }
    public String getSentimentVelocity() { return sentimentVelocity; }
    public void setSentimentVelocity(String sentimentVelocity) { this.sentimentVelocity = sentimentVelocity; }
    public long getTotalAnalyzed() { return totalAnalyzed; }
    public void setTotalAnalyzed(long totalAnalyzed) { this.totalAnalyzed = totalAnalyzed; }
}
