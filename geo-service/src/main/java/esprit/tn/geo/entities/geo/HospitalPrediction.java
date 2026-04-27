package esprit.tn.geo.entities.geo;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "hospital_predictions")
public class HospitalPrediction {
    @Id
    private String id;

    private Long patientId;
    private String patientName;
    private String incidentId;
    private String alertId;
    private String typeIncident;
    private Double patientLatitude;
    private Double patientLongitude;
    private List<RecommendedHospital> hopitaux = new ArrayList<>();
    private LocalDateTime createdAt = LocalDateTime.now();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public Long getPatientId() { return patientId; }
    public void setPatientId(Long patientId) { this.patientId = patientId; }
    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }
    public String getIncidentId() { return incidentId; }
    public void setIncidentId(String incidentId) { this.incidentId = incidentId; }
    public String getAlertId() { return alertId; }
    public void setAlertId(String alertId) { this.alertId = alertId; }
    public String getTypeIncident() { return typeIncident; }
    public void setTypeIncident(String typeIncident) { this.typeIncident = typeIncident; }
    public Double getPatientLatitude() { return patientLatitude; }
    public void setPatientLatitude(Double patientLatitude) { this.patientLatitude = patientLatitude; }
    public Double getPatientLongitude() { return patientLongitude; }
    public void setPatientLongitude(Double patientLongitude) { this.patientLongitude = patientLongitude; }
    public List<RecommendedHospital> getHopitaux() { return hopitaux; }
    public void setHopitaux(List<RecommendedHospital> hopitaux) { this.hopitaux = hopitaux; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
