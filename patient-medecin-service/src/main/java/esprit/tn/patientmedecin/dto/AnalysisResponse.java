package esprit.tn.patientmedecin.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AnalysisResponse {
    private String predicted_class;
    private double[][] probabilities;
    private double prediction_score;
    private Double pourcentage_risque; // Added matching property

    // Default constructor
    public AnalysisResponse() {}
}
