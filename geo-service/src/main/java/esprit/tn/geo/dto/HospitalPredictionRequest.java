package esprit.tn.geo.dto;

public class HospitalPredictionRequest {
    private Double patientLatitude;
    private Double patientLongitude;
    private String typeIncident;
    private Long patientId;
    private String incidentId;
    private String alertId;
    private String patientName;

    public Double getPatientLatitude() { return patientLatitude; }
    public void setPatientLatitude(Double patientLatitude) { this.patientLatitude = patientLatitude; }
    public Double getPatientLongitude() { return patientLongitude; }
    public void setPatientLongitude(Double patientLongitude) { this.patientLongitude = patientLongitude; }
    public String getTypeIncident() { return typeIncident; }
    public void setTypeIncident(String typeIncident) { this.typeIncident = typeIncident; }
    public Long getPatientId() { return patientId; }
    public void setPatientId(Long patientId) { this.patientId = patientId; }
    public String getIncidentId() { return incidentId; }
    public void setIncidentId(String incidentId) { this.incidentId = incidentId; }
    public String getAlertId() { return alertId; }
    public void setAlertId(String alertId) { this.alertId = alertId; }
    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }
}
