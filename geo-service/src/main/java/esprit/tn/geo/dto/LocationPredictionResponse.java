package esprit.tn.geo.dto;

import java.time.LocalDateTime;

public class LocationPredictionResponse {
    private String lieu;
    private String confiance;
    private String statut;
    private Long patientId;
    private LocalDateTime date;
    private String incidentId;

    public String getLieu() {
        return lieu;
    }

    public void setLieu(String lieu) {
        this.lieu = lieu;
    }

    public String getConfiance() {
        return confiance;
    }

    public void setConfiance(String confiance) {
        this.confiance = confiance;
    }

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }

    public Long getPatientId() {
        return patientId;
    }

    public void setPatientId(Long patientId) {
        this.patientId = patientId;
    }

    public LocalDateTime getDate() {
        return date;
    }

    public void setDate(LocalDateTime date) {
        this.date = date;
    }

    public String getIncidentId() {
        return incidentId;
    }

    public void setIncidentId(String incidentId) {
        this.incidentId = incidentId;
    }
}
