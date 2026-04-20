package esprit.tn.backpi.dto;

public class AnalysisResponse {
    private String result;

    public AnalysisResponse() {
    }

    public AnalysisResponse(String result) {
        this.result = result;
    }

    public String getResult() {
        return result;
    }

    public void setResult(String result) {
        this.result = result;
    }
}
