package esprit.tn.patientmedecin.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AnalysisRequest {
    private String fileBase64;
    private String filename; // Added filename
    private String file_content; // Or file_content if the Flask API expects it
    private Long id;
    private String content;

    // Constructors
    public AnalysisRequest() {}

    public AnalysisRequest(String fileBase64, String filename) {
        this.fileBase64 = fileBase64;
        this.filename = filename;
    }
}
