package esprit.tn.backpi.helpnotification.service;

import esprit.tn.backpi.entity.PatientContact;
import esprit.tn.backpi.entity.Role;
import esprit.tn.backpi.entity.User;
import esprit.tn.backpi.helpnotification.mail.HelpNotificationEmailTemplate;
import esprit.tn.backpi.helpnotification.mail.HelpNotificationMailService;
import esprit.tn.backpi.repository.PatientContactRepository;
import esprit.tn.backpi.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Core help-notification orchestration service.
 *
 * Supports two trigger modes:
 *   <b>Mode A (Manual)</b> — Patient clicks "Send Help" button → sends basic
 *   WebSocket notification + simple email to all contacts. No cooldown.
 *
 *   <b>Mode B (Automatic)</b> — Heart-rate danger condition detected via Kafka
 *   → sends enriched WebSocket notification + professional HTML email.
 *   Subject to a global per-patient cooldown (default 60 seconds).
 *
 * VERSION 1.1 changes:
 *   - Added global per-patient cooldown for automatic alerts
 *   - Enriched WebSocket payload for automatic alerts
 *   - Automatic emails now use dedicated HTML mail subsystem
 *   - Manual mode unchanged (no cooldown, simple email)
 */
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

    @Autowired
    private HelpNotificationMailService helpNotificationMailService;

    /** Global per-patient cooldown: patientUserId → last automatic notification timestamp */
    private final ConcurrentHashMap<Long, Instant> globalAutoCooldowns = new ConcurrentHashMap<>();

    /** Configurable cooldown duration in seconds (default 60) */
    @Value("${helpnotification.alert.global-cooldown-seconds:60}")
    private long globalCooldownSeconds;

    // ═══════════════════════════════════════════════════════════════════
    // MODE A: Manual trigger from patient button click (unchanged)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Mode A: Manual trigger from patient button click (existing behavior).
     *
     * Send help notification from a patient to all their contacts.
     * - If contact_user_id != null: send in-platform live notification + email (if email exists)
     * - If contact_user_id == null: send email only (if email exists)
     *
     * No cooldown applied — manual help requests are always sent immediately.
     */
    public Map<String, Object> sendHelpNotification(Long patientUserId) {
        String patientName = getPatientName(patientUserId);
        String notificationMessage = "Help notification from patient " + patientName;
        return doSendManualHelpNotification(patientUserId, patientName, notificationMessage);
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODE B: Automatic trigger from Kafka heart-rate alert
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Mode B: Automatic trigger from confirmed heart-rate alert.
     *
     * Called by {@link AlertConfirmationService} after the 10-second
     * confirmation delay has passed and the alert is still valid.
     *
     * Subject to global per-patient cooldown: if any automatic notification
     * was sent for this patient within the last {@code globalCooldownSeconds},
     * this call is silently skipped regardless of condition type.
     *
     * @param patientUserId  the patient whose heart-rate triggered the alert
     * @param alertMessage   human-readable condition description from smartwatch-service
     * @param conditionType  condition type (e.g. "TACHYCARDIE", "BRADYCARDIE")
     * @param bpm            the BPM value that triggered the alert
     * @param detectedAt     when the condition was first detected
     */
    public Map<String, Object> sendAutomaticHelpNotification(Long patientUserId,
                                                              String alertMessage,
                                                              String conditionType,
                                                              Integer bpm,
                                                              Instant detectedAt) {
        // ── Global per-patient cooldown check ──
        Instant now = Instant.now();
        Instant lastNotified = globalAutoCooldowns.get(patientUserId);
        if (lastNotified != null) {
            long elapsed = now.getEpochSecond() - lastNotified.getEpochSecond();
            if (elapsed < globalCooldownSeconds) {
                System.out.println("🛑 [HelpNotification] BLOCKED by global cooldown: userId="
                        + patientUserId + ", condition=" + conditionType
                        + ", elapsed=" + elapsed + "s / " + globalCooldownSeconds + "s required");

                Map<String, Object> result = new HashMap<>();
                result.put("message", "Blocked by global cooldown");
                result.put("cooldownRemaining", globalCooldownSeconds - elapsed);
                return result;
            }
        }

        // ── Cooldown allowed — update timestamp ──
        globalAutoCooldowns.put(patientUserId, now);

        // ── Proceed with enriched notification ──
        String patientName = getPatientName(patientUserId);
        return doSendAutomaticHelpNotification(
                patientUserId, patientName, conditionType, alertMessage, bpm, detectedAt
        );
    }

    // ═══════════════════════════════════════════════════════════════════
    // Internal: Manual notification delivery (simple)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Shared internal logic for MANUAL help notifications.
     * Sends basic WebSocket push + simple plain-text email.
     * Unchanged from VERSION 1.0.
     */
    private Map<String, Object> doSendManualHelpNotification(Long patientUserId,
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
                    sendSimpleEmail(contact.getEmail(), notificationMessage);
                    emailCount++;
                }
            }
            // Case 2: external contact only
            else {
                // Send email only if email exists
                if (contact.getEmail() != null && !contact.getEmail().isBlank()) {
                    sendSimpleEmail(contact.getEmail(), notificationMessage);
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

    // ═══════════════════════════════════════════════════════════════════
    // Internal: Automatic notification delivery (enriched)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Internal logic for AUTOMATIC heart-rate danger notifications.
     *
     * Sends:
     *   - Enriched WebSocket payload with condition details
     *   - Professional HTML email via the dedicated mail subsystem
     */
    private Map<String, Object> doSendAutomaticHelpNotification(Long patientUserId,
                                                                 String patientName,
                                                                 String conditionType,
                                                                 String alertMessage,
                                                                 Integer bpm,
                                                                 Instant detectedAt) {
        // Load all contacts for this patient
        List<PatientContact> contacts = patientContactRepository.findByPatientUserId(patientUserId);

        String conditionDescription = HelpNotificationEmailTemplate.getConditionDescription(conditionType);
        String formattedTimestamp = detectedAt != null
                ? DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
                        .withZone(ZoneId.systemDefault())
                        .format(detectedAt)
                : LocalDateTime.now().toString();

        int platformNotifCount = 0;
        int emailCount = 0;

        for (PatientContact contact : contacts) {

            String contactFullName = ((contact.getPrenom() != null ? contact.getPrenom() : "") + " "
                    + (contact.getNom() != null ? contact.getNom() : "")).trim();

            // Case 1: linked platform user
            if (contact.getContactUserId() != null) {
                // ── Enriched WebSocket payload for automatic alerts ──
                Map<String, Object> wsPayload = new HashMap<>();
                wsPayload.put("type", "HEART_RATE_DANGER_ALERT");
                wsPayload.put("content", "🚨 URGENT: " + conditionDescription
                        + " detected for patient " + patientName
                        + ". Please check on the patient immediately.");
                wsPayload.put("patientId", patientUserId);
                wsPayload.put("patientName", patientName);
                wsPayload.put("conditionType", conditionType);
                wsPayload.put("conditionDescription", conditionDescription);
                wsPayload.put("bpm", bpm);
                wsPayload.put("severity", "CRITICAL");
                wsPayload.put("source", "HEART_RATE_ALERT");
                wsPayload.put("contactName", contactFullName);
                wsPayload.put("relationType", contact.getRelationType() != null ? contact.getRelationType().name() : "");
                wsPayload.put("timestamp", formattedTimestamp);
                wsPayload.put("actionRequired", "Please check on the patient immediately");

                messagingTemplate.convertAndSendToUser(
                        contact.getContactUserId().toString(),
                        "/queue/help-notifications",
                        wsPayload
                );
                platformNotifCount++;

                // ── HTML email via dedicated mail subsystem ──
                if (contact.getEmail() != null && !contact.getEmail().isBlank()) {
                    helpNotificationMailService.sendDangerAlertEmail(
                            contact.getEmail(),
                            patientName,
                            conditionType,
                            alertMessage,
                            bpm,
                            detectedAt,
                            contactFullName
                    );
                    emailCount++;
                }
            }
            // Case 2: external contact only
            else {
                if (contact.getEmail() != null && !contact.getEmail().isBlank()) {
                    helpNotificationMailService.sendDangerAlertEmail(
                            contact.getEmail(),
                            patientName,
                            conditionType,
                            alertMessage,
                            bpm,
                            detectedAt,
                            contactFullName
                    );
                    emailCount++;
                }
            }
        }

        System.out.println("✅ [HelpNotification] Automatic alert sent: userId=" + patientUserId
                + ", condition=" + conditionType + ", contacts=" + contacts.size()
                + ", wsNotifs=" + platformNotifCount + ", emails=" + emailCount);

        Map<String, Object> result = new HashMap<>();
        result.put("message", "Automatic help notification sent successfully");
        result.put("totalContacts", contacts.size());
        result.put("platformNotificationsSent", platformNotifCount);
        result.put("emailsSent", emailCount);
        result.put("conditionType", conditionType);
        result.put("source", "HEART_RATE_ALERT");
        return result;
    }

    // ═══════════════════════════════════════════════════════════════════
    // Shared utilities
    // ═══════════════════════════════════════════════════════════════════

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
     * Send a simple plain-text email (used by manual mode only).
     */
    private void sendSimpleEmail(String to, String messageBody) {
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
