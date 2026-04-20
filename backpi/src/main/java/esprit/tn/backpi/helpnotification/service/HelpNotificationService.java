package esprit.tn.backpi.helpnotification.service;

import esprit.tn.backpi.entity.PatientContact;
import esprit.tn.backpi.entity.Role;
import esprit.tn.backpi.entity.User;
import esprit.tn.backpi.repository.PatientContactRepository;
import esprit.tn.backpi.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class HelpNotificationService {

    @Autowired
    private PatientContactRepository patientContactRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private JavaMailSender mailSender;

    /**
     * Mode A: Manual trigger from patient button click (existing behavior).
     *
     * Send help notification from a patient to all their contacts.
     * - If contact_user_id != null: send in-platform live notification + email (if email exists)
     * - If contact_user_id == null: send email only (if email exists)
     */
    public Map<String, Object> sendHelpNotification(Long patientUserId) {
        String patientName = getPatientName(patientUserId);
        String notificationMessage = "Help notification from patient " + patientName;
        return doSendHelpNotification(patientUserId, patientName, notificationMessage);
    }

    /**
     * Mode B: Automatic trigger from Kafka heart-rate alert.
     *
     * Called by HeartRateHelpNotificationConsumer when a danger condition
     * is detected in the heart-rate stream.
     *
     * @param patientUserId  the patient whose heart-rate triggered the alert
     * @param alertMessage   human-readable condition description
     * @param source         trigger source (e.g. "HEART_RATE_ALERT")
     * @param conditionType  condition type (e.g. "TACHYCARDIE", "PIC_SOUDAIN")
     */
    public Map<String, Object> sendHelpNotification(Long patientUserId,
                                                     String alertMessage,
                                                     String source,
                                                     String conditionType) {
        String patientName = getPatientName(patientUserId);
        String notificationMessage = "\u26a0\ufe0f " + alertMessage + " — Patient: " + patientName;
        return doSendHelpNotification(patientUserId, patientName, notificationMessage);
    }

    /**
     * Shared internal logic — loads contacts, sends WebSocket push + email.
     * Used by both manual and automatic trigger paths.
     */
    private Map<String, Object> doSendHelpNotification(Long patientUserId,
                                                        String patientName,
                                                        String notificationMessage) {
        // Load all contacts for this patient
        List<PatientContact> contacts = patientContactRepository.findByPatientUserId(patientUserId);

        int platformNotifCount = 0;
        int emailCount = 0;

        for (PatientContact contact : contacts) {

            // Case 1: linked platform user
            if (contact.getContactUserId() != null) {
                // Send in-platform live notification via WebSocket
                Map<String, Object> wsPayload = new HashMap<>();
                wsPayload.put("type", "HELP_NOTIFICATION");
                wsPayload.put("content", notificationMessage);
                wsPayload.put("patientId", patientUserId);
                wsPayload.put("patientName", patientName);
                wsPayload.put("contactName", (contact.getPrenom() != null ? contact.getPrenom() : "") + " "
                        + (contact.getNom() != null ? contact.getNom() : ""));
                wsPayload.put("relationType", contact.getRelationType() != null ? contact.getRelationType().name() : "");
                wsPayload.put("timestamp", LocalDateTime.now().toString());

                messagingTemplate.convertAndSendToUser(
                        contact.getContactUserId().toString(),
                        "/queue/help-notifications",
                        wsPayload
                );
                platformNotifCount++;

                // Also send email if email exists
                if (contact.getEmail() != null && !contact.getEmail().isBlank()) {
                    sendEmail(contact.getEmail(), notificationMessage);
                    emailCount++;
                }
            }
            // Case 2: external contact only
            else {
                // Send email only if email exists
                if (contact.getEmail() != null && !contact.getEmail().isBlank()) {
                    sendEmail(contact.getEmail(), notificationMessage);
                    emailCount++;
                }
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("message", "Help notification sent successfully");
        result.put("totalContacts", contacts.size());
        result.put("platformNotificationsSent", platformNotifCount);
        result.put("emailsSent", emailCount);
        return result;
    }

    /**
     * Get the patient's display name after validating they exist and have role PATIENT.
     */
    private String getPatientName(Long patientUserId) {
        User patient = userRepository.findById(patientUserId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (patient.getRole() != Role.PATIENT) {
            throw new RuntimeException("User is not a patient");
        }

        String patientName = (patient.getPrenom() != null ? patient.getPrenom() : "") + " "
                + (patient.getNom() != null ? patient.getNom() : "");
        return patientName.trim();
    }

    /**
     * Send a simple email for help notification.
     */
    private void sendEmail(String to, String messageBody) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject("Help Notification");
            message.setText(messageBody);
            mailSender.send(message);
            System.out.println("[HelpNotification] Email sent to: " + to);
        } catch (Exception e) {
            System.err.println("[HelpNotification] Failed to send email to " + to + ": " + e.getMessage());
        }
    }
}
