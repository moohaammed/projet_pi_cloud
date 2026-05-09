package esprit.tn.backpi.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;

@Document(collection = "patient_contact")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class PatientContact {

    // ── Sequence name used by PatientContactModelListener ────────────────────
    @Transient
    public static final String SEQUENCE_NAME = "patient_contact_sequence";

    // ── Fields ────────────────────────────────────────────────────────────────
    @Id
    private Long id;

    /** Logical FK → users._id (role = PATIENT) */
    @Field("patient_user_id")
    private Long patientUserId;

    /** Logical FK → users._id (role = RELATION) — nullable */
    @Field("contact_user_id")
    private Long contactUserId;

    @Field("relation_type")
    private RelationType relationType;

    @Field("nom")
    private String nom;

    @Field("prenom")
    private String prenom;

    @Field("email")
    private String email;

    @Field("telephone")
    private String telephone;

    @Field("created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    // ── Getters & Setters ─────────────────────────────────────────────────────
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getPatientUserId() { return patientUserId; }
    public void setPatientUserId(Long patientUserId) { this.patientUserId = patientUserId; }

    public Long getContactUserId() { return contactUserId; }
    public void setContactUserId(Long contactUserId) { this.contactUserId = contactUserId; }

    public RelationType getRelationType() { return relationType; }
    public void setRelationType(RelationType relationType) { this.relationType = relationType; }

    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }

    public String getPrenom() { return prenom; }
    public void setPrenom(String prenom) { this.prenom = prenom; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getTelephone() { return telephone; }
    public void setTelephone(String telephone) { this.telephone = telephone; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
