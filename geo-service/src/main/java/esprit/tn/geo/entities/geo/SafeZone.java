package esprit.tn.geo.entities.geo;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "safe_zones")
public class SafeZone {

    @Id
    private String id;

    private Long patientId;
    private Long doctorId;

    private String nom;

    private Double latitudeCentre;
    private Double longitudeCentre;

    private Integer rayonVert = 200;   // en mètres
    private Integer rayonRouge = 500;  // en mètres

    private boolean actif = true;
    private LocalDateTime updatedAt = LocalDateTime.now();

    // Getters / Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public Long getPatientId() { return patientId; }
    public void setPatientId(Long patientId) { this.patientId = patientId; }
    public Long getDoctorId() { return doctorId; }
    public void setDoctorId(Long doctorId) { this.doctorId = doctorId; }
    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }
    public Double getLatitudeCentre() { return latitudeCentre; }
    public void setLatitudeCentre(Double latitudeCentre) { this.latitudeCentre = latitudeCentre; }
    public Double getLongitudeCentre() { return longitudeCentre; }
    public void setLongitudeCentre(Double longitudeCentre) { this.longitudeCentre = longitudeCentre; }
    public Integer getRayonVert() { return rayonVert; }
    public void setRayonVert(Integer rayonVert) { this.rayonVert = rayonVert; }
    public Integer getRayonRouge() { return rayonRouge; }
    public void setRayonRouge(Integer rayonRouge) { this.rayonRouge = rayonRouge; }
    public boolean isActif() { return actif; }
    public void setActif(boolean actif) { this.actif = actif; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
