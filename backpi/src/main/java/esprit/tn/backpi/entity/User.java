package esprit.tn.backpi.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;

@Document(collection = "users")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class User {

    // ── Sequence name used by UserModelListener ──────────────────────────────
    @Transient
    public static final String SEQUENCE_NAME = "users_sequence";

    // ── Fields ────────────────────────────────────────────────────────────────
    @Id
    private Long id;

    @Field("nom")
    private String nom;

    @Field("prenom")
    private String prenom;

    @Indexed(unique = true)
    @Field("email")
    private String email;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Field("password")
    private String password;

    @Field("role")
    private Role role;

    @Field("telephone")
    private String telephone;

    @Field("image")
    private String image;

    @Field("actif")
    private boolean actif = true;

    @JsonProperty("isLive")
    @Field("is_live")
    private boolean isLive = false;

    @Field("created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    /** Logical FK → patient-medecin-service Patient._id */
    @Field("patient_id")
    private Long patientId;

    /** Logical FK → another User._id (RELATION role) */
    @Field("relation_id")
    private Long relationId;

    @Field("lien_avec_patient")
    private String lienAvecPatient;

    @Field("fcm_token")
    private String fcmToken;

    // ── Getters & Setters ─────────────────────────────────────────────────────
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }

    public String getPrenom() { return prenom; }
    public void setPrenom(String prenom) { this.prenom = prenom; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public String getTelephone() { return telephone; }
    public void setTelephone(String telephone) { this.telephone = telephone; }

    public String getImage() { return image; }
    public void setImage(String image) { this.image = image; }

    public boolean isActif() { return actif; }
    public void setActif(boolean actif) { this.actif = actif; }

    @JsonProperty("isLive")
    public boolean isLive() { return isLive; }
    public void setLive(boolean live) { isLive = live; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public Long getPatientId() { return patientId; }
    public void setPatientId(Long patientId) { this.patientId = patientId; }

    public Long getRelationId() { return relationId; }
    public void setRelationId(Long relationId) { this.relationId = relationId; }

    public String getLienAvecPatient() { return lienAvecPatient; }
    public void setLienAvecPatient(String lienAvecPatient) { this.lienAvecPatient = lienAvecPatient; }

    public String getFcmToken() { return fcmToken; }
    public void setFcmToken(String fcmToken) { this.fcmToken = fcmToken; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        User user = (User) o;
        return id != null && id.equals(user.id);
    }

    @Override
    public int hashCode() {
        return id != null ? id.hashCode() : 0;
    }
}
