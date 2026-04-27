package esprit.tn.backpi.helpnotification.dto;

import esprit.tn.backpi.entity.RelationType;

public class PatientContactDTO {

    private Long id;
    private Long patientUserId;
    private Long contactUserId;
    private RelationType relationType;
    private String nom;
    private String prenom;
    private String email;
    private String telephone;

    // Getters and Setters

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
}
