package esprit.tn.backpi.dto;

import lombok.Data;

/**
 * DTO envoyé par le médecin pour créer simultanément
 * un compte PATIENT et un compte RELATION.
 */
@Data
public class PatientCreationRequest {

    // ── Infos Patient ─────────────────────────────────────────
    private String patientNom;
    private String patientPrenom;
    private String patientEmail;
    private String patientTelephone;
    private String patientDateNaissance;   // format yyyy-MM-dd
    private String patientAdresse;
    private String stadeAlzheimer;         // LEGER / MODERE / SEVERE
    private String notesmédicales;

    // ── Contact d'urgence / Relation ─────────────────────────
    private boolean creerCompteRelation;   // true = générer un compte relation

    private String relationNom;
    private String relationPrenom;
    private String relationEmail;
    private String relationTelephone;
    private String lienAvecPatient;
    private Long existingPatientId;// fils, fille, femme, mari, frère...
}