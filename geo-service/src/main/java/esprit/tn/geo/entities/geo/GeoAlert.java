package esprit.tn.geo.entities.geo;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "geo_alerts")
public class GeoAlert {

    @Id
    private String id;

    private Long patientId;

    private TypeAlerte typeAlerte;

    private Double latitude;
    private Double longitude;

    private boolean smsSent = false;
    private String message;
    private boolean resolue = false;
    private LocalDateTime declencheeAt = LocalDateTime.now();
    private LocalDateTime resolueAt;

    // Getters / Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public Long getPatientId() { return patientId; }
    public void setPatientId(Long patientId) { this.patientId = patientId; }
    public boolean isSmsSent() { return smsSent; }
    public void setSmsSent(boolean smsSent) { this.smsSent = smsSent; }
    public TypeAlerte getTypeAlerte() { return typeAlerte; }
    public void setTypeAlerte(TypeAlerte typeAlerte) { this.typeAlerte = typeAlerte; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public boolean isResolue() { return resolue; }
    public void setResolue(boolean resolue) { this.resolue = resolue; }
    public LocalDateTime getDeclencheeAt() { return declencheeAt; }
    public void setDeclencheeAt(LocalDateTime d) { this.declencheeAt = d; }
    public LocalDateTime getResolueAt() { return resolueAt; }
    public void setResolueAt(LocalDateTime r) { this.resolueAt = r; }
}
