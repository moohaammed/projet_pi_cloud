package esprit.tn.geo.dto;

/**
 * Payload reçu depuis Angular après analyse CLIP.
 */
public class IncidentRequest {

    private Long reporterId;
    private Long patientId;
    private String aiAnalysis;
    private Double aiConfidence;
    private Double latitude;
    private Double longitude;
    private String media;

    public Long getReporterId() { return reporterId; }
    public void setReporterId(Long reporterId) { this.reporterId = reporterId; }

    public Long getPatientId() { return patientId; }
    public void setPatientId(Long patientId) { this.patientId = patientId; }

    public String getAiAnalysis() { return aiAnalysis; }
    public void setAiAnalysis(String aiAnalysis) { this.aiAnalysis = aiAnalysis; }

    public Double getAiConfidence() { return aiConfidence; }
    public void setAiConfidence(Double aiConfidence) { this.aiConfidence = aiConfidence; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public String getMedia() { return media; }
    public void setMedia(String media) { this.media = media; }
}
