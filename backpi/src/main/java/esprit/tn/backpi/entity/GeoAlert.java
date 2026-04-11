package esprit.tn.backpi.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "geo_alerts")
public class GeoAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "patient_id", nullable = false)
    private User patient;

    @Enumerated(EnumType.STRING)
    private TypeAlerte typeAlerte;

    private Double latitude;
    private Double longitude;

    @Column(name = "sms_sent", columnDefinition = "BOOLEAN DEFAULT FALSE")
    private boolean smsSent = false;

    private String message;

    @Column(name = "resolved", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private boolean resolue = false;
    private LocalDateTime declencheeAt = LocalDateTime.now();
    private LocalDateTime resolueAt;
    public boolean isSmsSent() { return smsSent; }
    public void setSmsSent(boolean smsSent) { this.smsSent = smsSent; }
    // Getters / Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getPatient() { return patient; }
    public void setPatient(User patient) { this.patient = patient; }
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