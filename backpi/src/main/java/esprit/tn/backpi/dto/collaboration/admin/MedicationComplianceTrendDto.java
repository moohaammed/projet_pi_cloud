package esprit.tn.backpi.dto.collaboration.admin;

import java.util.List;

public class MedicationComplianceTrendDto {

    private List<String> labels;
    private List<Double> yesPercentages;

    public List<String> getLabels() { return labels; }
    public void setLabels(List<String> labels) { this.labels = labels; }
    public List<Double> getYesPercentages() { return yesPercentages; }
    public void setYesPercentages(List<Double> yesPercentages) { this.yesPercentages = yesPercentages; }
}
