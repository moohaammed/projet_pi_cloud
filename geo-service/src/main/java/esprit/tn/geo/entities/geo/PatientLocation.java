package esprit.tn.geo.entities.geo;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "patient_locations")
public class PatientLocation {

    @Id
    private String id;

    private Long patientId;

    private Double latitude;
    private Double longitude;
    private Integer batterie;
    private LocalDateTime timestamp = LocalDateTime.now();

    // Getters / Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public Long getPatientId() { return patientId; }
    public void setPatientId(Long patientId) { this.patientId = patientId; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public Integer getBatterie() { return batterie; }
    public void setBatterie(Integer batterie) { this.batterie = batterie; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
