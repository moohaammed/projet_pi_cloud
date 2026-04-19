package esprit.tn.backpi.services.gestion_patient;

import esprit.tn.backpi.entities.gestion_patient.RappelQuotidien;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * Sends email notifications for daily reminders (rappel_quotidien).
 * Uses the existing JavaMailSender bean auto-configured from application.properties (spring.mail.*).
 * No new packages or API keys required.
 */
@Service
@Slf4j
public class RappelEmailService {

    private final JavaMailSender mailSender;
    private final esprit.tn.backpi.repositories.gestion_patient.PatientRepository patientRepo;

    public RappelEmailService(JavaMailSender mailSender, esprit.tn.backpi.repositories.gestion_patient.PatientRepository patientRepo) {
        this.mailSender = mailSender;
        this.patientRepo = patientRepo;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Called by ReminderScheduler when a scheduled reminder fires
    // ─────────────────────────────────────────────────────────────────────────
    public void sendScheduledReminderEmail(RappelQuotidien rappel) {
        String email = extractEmail(rappel);
        if (email == null) return;

        String description = rappel.getDescription() != null ? rappel.getDescription() : rappel.getTitre();
        String heure = rappel.getHeureRappel() != null ? rappel.getHeureRappel().toString() : "Aucune";
        String patientName = rappel.getPatient().getPrenom() + " " + rappel.getPatient().getNom();

        sendHtmlEmail(email, "Medical Reminder Notification", rappel.getTitre(), description, heure, patientName);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Called by RappelQuotidienController when a doctor creates a new reminder
    // ─────────────────────────────────────────────────────────────────────────
    public void sendNewReminderCreatedEmail(RappelQuotidien rappel) {
        String email = extractEmail(rappel);
        if (email == null) return;

        String description = rappel.getDescription() != null ? rappel.getDescription() : rappel.getTitre();
        String heure = rappel.getHeureRappel() != null ? rappel.getHeureRappel().toString() : "Aucune";
        String patientName = rappel.getPatient().getPrenom() + " " + rappel.getPatient().getNom();

        sendHtmlEmail(email, "Medical Reminder Notification", rappel.getTitre(), description, heure, patientName);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Extracts the patient's email via patient → user → email.
     * Ensure the complete Patient is retrieved from DB because the incoming object 
     * from REST may only contain an ID stub.
     */
    private String extractEmail(RappelQuotidien rappel) {
        try {
            if (rappel.getPatient() == null || rappel.getPatient().getId() == null) return null;
            
            esprit.tn.backpi.entities.gestion_patient.Patient fullPatient = 
                    patientRepo.findById(rappel.getPatient().getId()).orElse(null);
                    
            if (fullPatient == null) return null;
            if (fullPatient.getUser() == null) return null;
            
            String email = fullPatient.getUser().getEmail();
            if (email == null || email.isBlank()) return null;
            
            return email;
        } catch (Exception e) {
            log.warn("[RappelEmail] Could not resolve patient email: {}", e.getMessage());
            return null;
        }
    }

    private void sendHtmlEmail(String to, String subject, String titre, String description, String heure, String patientName) {
        try {
            org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
            
            java.util.Map<String, String> payload = new java.util.HashMap<>();
            payload.put("patient_email", to);
            payload.put("patient_name", patientName != null ? patientName : "Patient");
            payload.put("message", description);
            payload.put("date", heure);
            
            // Call the Python microservice that handles Resend API
            String pythonEndpoint = "http://localhost:5000/send-reminder-email";
            org.springframework.http.ResponseEntity<String> response = restTemplate.postForEntity(
                    pythonEndpoint, 
                    payload, 
                    String.class
            );
            
            log.info("[RappelEmail] Triggered Python Resend API for {} — status: {}", to, response.getStatusCode());
        } catch (Exception e) {
            // Log error but do NOT re-throw: email failure must never block the app
            log.error("[RappelEmail] Unexpected error calling Python Resend API to {}: {}", to, e.getMessage());
        }
    }
}
