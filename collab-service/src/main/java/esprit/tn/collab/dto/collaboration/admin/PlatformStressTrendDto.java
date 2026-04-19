package esprit.tn.collab.dto.collaboration.admin;

import java.util.List;

public class PlatformStressTrendDto {
    private List<String> labels;
    private List<Long> totalActivitySeries;
    private List<Long> negativeSentimentSeries;
    private List<Long> criticalAlertSeries;

    public List<String> getLabels() { return labels; }
    public void setLabels(List<String> labels) { this.labels = labels; }
    public List<Long> getTotalActivitySeries() { return totalActivitySeries; }
    public void setTotalActivitySeries(List<Long> totalActivitySeries) { this.totalActivitySeries = totalActivitySeries; }
    public List<Long> getNegativeSentimentSeries() { return negativeSentimentSeries; }
    public void setNegativeSentimentSeries(List<Long> negativeSentimentSeries) { this.negativeSentimentSeries = negativeSentimentSeries; }
    public List<Long> getCriticalAlertSeries() { return criticalAlertSeries; }
    public void setCriticalAlertSeries(List<Long> criticalAlertSeries) { this.criticalAlertSeries = criticalAlertSeries; }
}
