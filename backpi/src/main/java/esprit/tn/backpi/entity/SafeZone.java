package esprit.tn.backpi.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "safe_zones")
public class SafeZone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "patient_id", nullable = false)
    private User patient;

    @ManyToOne
    @JoinColumn(name = "doctor_id", nullable = false)
    private User doctor;

    private String nom;

    @Column(nullable = false)
    private Double latitudeCentre;

    @Column(nullable = false)
    private Double longitudeCentre;

    private Integer rayonVert = 200;   // en mètres
    private Integer rayonRouge = 500;  // en mètres

    private boolean actif = true;

    private LocalDateTime updatedAt = LocalDateTime.now();

    // Getters / Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getPatient() { return patient; }
    public void setPatient(User patient) { this.patient = patient; }
    public User getDoctor() { return doctor; }
    public void setDoctor(User doctor) { this.doctor = doctor; }
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
