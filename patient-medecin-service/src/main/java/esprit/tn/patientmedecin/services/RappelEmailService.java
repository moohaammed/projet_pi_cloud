package esprit.tn.patientmedecin.services;

import esprit.tn.patientmedecin.entities.Patient;
import esprit.tn.patientmedecin.entities.RappelQuotidien;
import esprit.tn.patientmedecin.repositories.PatientRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class RappelEmailService {

    private final JavaMailSender mailSender;
    private final PatientRepository patientRepo;

    public RappelEmailService(JavaMailSender mailSender, PatientRepository patientRepo) {
        this.mailSender = mailSender;
        this.patientRepo = patientRepo;
    }

    /**
     * Resolves the full Patient from DB, then sends a scheduled reminder email.
     */
    public void sendScheduledReminderEmail(RappelQuotidien rappel) {
        Patient fullPatient = resolveFullPatient(rappel);
        if (fullPatient == null) return;

        String email = resolveEmail(fullPatient);
        if (email == null) return;

        String description = rappel.getDescription() != null ? rappel.getDescription() : rappel.getTitre();
        String heure = rappel.getHeureRappel() != null ? rappel.getHeureRappel().toString() : "Aucune";
        String patientName = buildPatientName(fullPatient);

        sendHtmlEmail(email, "Medical Reminder Notification", rappel.getTitre(), description, heure, patientName);
    }

    /**
     * Resolves the full Patient from DB, then sends a "new reminder created" email.
     */
    public void sendNewReminderCreatedEmail(RappelQuotidien rappel) {
        Patient fullPatient = resolveFullPatient(rappel);
        if (fullPatient == null) return;

        String email = resolveEmail(fullPatient);
        if (email == null) return;

        String description = rappel.getDescription() != null ? rappel.getDescription() : rappel.getTitre();
        String heure = rappel.getHeureRappel() != null ? rappel.getHeureRappel().toString() : "Aucune";
        String patientName = buildPatientName(fullPatient);

        sendHtmlEmail(email, "Medical Reminder Notification", rappel.getTitre(), description, heure, patientName);
    }

    /**
     * Loads the complete Patient document from MongoDB using the ID embedded in the rappel.
     * Returns null if the patient is missing or cannot be resolved.
     */
    private Patient resolveFullPatient(RappelQuotidien rappel) {
        try {
            if (rappel.getPatient() == null || rappel.getPatient().getId() == null) {
                log.warn("[RappelEmail] Rappel has no patient reference — skipping email.");
                return null;
            }
            Patient fullPatient = patientRepo.findById(rappel.getPatient().getId()).orElse(null);
            if (fullPatient == null) {
                log.warn("[RappelEmail] Patient {} not found in DB — skipping email.", rappel.getPatient().getId());
            }
            return fullPatient;
        } catch (Exception e) {
            log.warn("[RappelEmail] Could not resolve patient from DB: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Extracts the email from a fully-loaded Patient object.
     */
    private String resolveEmail(Patient fullPatient) {
        if (fullPatient.getUser() == null) {
            log.warn("[RappelEmail] Patient {} has no UserInfo embedded — cannot determine email.", fullPatient.getId());
            return null;
        }
        String email = fullPatient.getUser().getEmail();
        if (email == null || email.isBlank()) {
            log.warn("[RappelEmail] Patient {} has a blank email — skipping.", fullPatient.getId());
            return null;
        }
        return email;
    }

    /**
     * Builds "Prénom Nom" from the full Patient, falling back to "Patient" if both are null.
     */
    private String buildPatientName(Patient fullPatient) {
        String prenom = fullPatient.getPrenom() != null ? fullPatient.getPrenom() : "";
        String nom    = fullPatient.getNom()    != null ? fullPatient.getNom()    : "";
        String name = (prenom + " " + nom).trim();
        return name.isEmpty() ? "Patient" : name;
    }

    private void sendHtmlEmail(String to, String subject, String titre, String description, String heure, String patientName) {
        try {
            log.info("[RappelEmail] Sending Gmail SMTP notification to: {}", to);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(to);
            helper.setSubject(subject);

            String htmlContent = String.format(
                "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;'>" +
                "  <h2 style='color: #8b5cf6;'>Nouveau Rappel Médical</h2>" +
                "  <p>Bonjour <strong>%s</strong>,</p>" +
                "  <p>Votre médecin a ajouté une nouvelle consigne à votre dossier :</p>" +
                "  <div style='background: #f3f4f6; padding: 15px; border-left: 4px solid #8b5cf6; margin: 20px 0;'>" +
                "    <h3 style='margin-top: 0;'>%s</h3>" +
                "    <p style='margin-bottom: 5px;'><strong>Instruction :</strong> %s</p>" +
                "    <p style='margin-bottom: 0;'><strong>Heure prévue :</strong> %s</p>" +
                "  </div>" +
                "  <p style='color: #6b7280; font-size: 12px;'>Ceci est une notification automatique. Merci de ne pas y répondre.</p>" +
                "</div>",
                patientName,
                titre,
                description,
                heure
            );

            helper.setText(htmlContent, true);
            mailSender.send(message);

            log.info("[RappelEmail] Email successfully sent via Gmail SMTP to {}", to);
        } catch (Exception e) {
            log.error("[RappelEmail] Failed to send email to {}: {}", to, e.getMessage());
        }
    }
}
