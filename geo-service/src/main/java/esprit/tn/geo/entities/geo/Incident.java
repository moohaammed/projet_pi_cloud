package esprit.tn.geo.entities.geo;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Document MongoDB représentant un incident de sécurité détecté par CLIP
 * pour un patient Alzheimer.
 * Stocke les IDs Spring Boot (Long) pour reporter et patient
 * afin d'éviter toute dépendance directe vers backpi.
 */
@Document(collection = "incidents")
public class Incident {

    @Id
    private String id;

    private String title;
    private String description;

    private IncidentType type;
    private IncidentStatus status = IncidentStatus.EN_COURS;

    // IDs des utilisateurs (référencés via Feign si nécessaire)
    private Long reporterId;  // DOCTOR ou RELATION qui a déclenché l'analyse
    private Long patientId;   // le patient Alzheimer concerné

    // Résultat CLIP
    private String aiAnalysis;    // label top CLIP  ex: "dangerous hole"
    private Double aiConfidence;  // score 0.0 – 1.0

    // Géolocalisation
    private Double latitude;
    private Double longitude;

    // Image (data-URL base64 ou URL)
    private String media;

    private String recommendedHospitalName;
    private List<RecommendedHospital> recommendedHospitals = new ArrayList<>();

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();

    // ─── Getters & Setters ──────────────────────────────────────────────────

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public IncidentType getType() { return type; }
    public void setType(IncidentType type) { this.type = type; }

    public IncidentStatus getStatus() { return status; }
    public void setStatus(IncidentStatus status) { this.status = status; }

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

    public String getRecommendedHospitalName() { return recommendedHospitalName; }
    public void setRecommendedHospitalName(String recommendedHospitalName) { this.recommendedHospitalName = recommendedHospitalName; }

    public List<RecommendedHospital> getRecommendedHospitals() { return recommendedHospitals; }
    public void setRecommendedHospitals(List<RecommendedHospital> recommendedHospitals) { this.recommendedHospitals = recommendedHospitals; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
