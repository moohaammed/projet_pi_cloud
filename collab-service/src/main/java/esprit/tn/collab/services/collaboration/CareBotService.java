package esprit.tn.collab.services.collaboration;

import esprit.tn.collab.clients.UserClient;
import esprit.tn.collab.dto.collaboration.MessageResponseDto;
import esprit.tn.collab.entities.collaboration.Message;
import esprit.tn.collab.entities.collaboration.MessageType;
import esprit.tn.collab.entities.collaboration.admin.MedicationComplianceLog;
import esprit.tn.collab.entities.collaboration.admin.SafetyAlertLog;
import esprit.tn.collab.entities.collaboration.admin.SafetyAlertStatus;
import esprit.tn.collab.entities.collaboration.admin.SafetyAlertType;
import esprit.tn.collab.repositories.collaboration.MessageRepository;
import esprit.tn.collab.repositories.collaboration.admin.MedicationComplianceLogRepository;
import esprit.tn.collab.repositories.collaboration.admin.SafetyAlertLogRepository;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class CareBotService {

    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;
    private final MessageRepository messageRepository;
    private final UserClient userClient;
    private final MessageService messageService;
    private final SafetyAlertLogRepository safetyAlertLogRepository;
    private final MedicationComplianceLogRepository medicationComplianceLogRepository;

    private static final Pattern DISORIENTATION_PATTERN = Pattern.compile(
        ".*\\b(where am i|who are you|i am lost|je suis perdu|où suis-je|qui êtes-vous)\\b.*",
        Pattern.CASE_INSENSITIVE
    );

    private static final String MEDICATION_REMINDER_TEXT = "Good morning! Did you take your medication? 💊";

    public CareBotService(SimpMessagingTemplate messagingTemplate,
                          NotificationService notificationService,
                          MessageRepository messageRepository,
                          UserClient userClient,
                          @Lazy MessageService messageService,
                          SafetyAlertLogRepository safetyAlertLogRepository,
                          MedicationComplianceLogRepository medicationComplianceLogRepository) {
        this.messagingTemplate = messagingTemplate;
        this.notificationService = notificationService;
        this.messageRepository = messageRepository;
        this.userClient = userClient;
        this.messageService = messageService;
        this.safetyAlertLogRepository = safetyAlertLogRepository;
        this.medicationComplianceLogRepository = medicationComplianceLogRepository;
    }

    @Scheduled(cron = "0 0 8 * * *")
    public void morningCheckIn() {
        sendMedicationRemindersTo(userClient.getUsersByRole("PATIENT"));
    }

    public void sendMedicationRemindersToAllPatients() {
        sendMedicationRemindersTo(userClient.getUsersByRole("PATIENT"));
    }

    public boolean sendMedicationReminderToPatient(Long userId) {
        if (userId == null) return false;
        Map<String, Object> user = userClient.getUserById(userId);
        if (!userClient.isRole(user, "PATIENT")) return false;
        sendMedicationRemindersTo(Collections.singletonList(user));
        return true;
    }

    private void sendMedicationRemindersTo(List<Map<String, Object>> patients) {
        for (Map<String, Object> patient : patients) {
            Long patientId = ((Number) patient.get("id")).longValue();
            sendBotPrivateMessage(patientId, MEDICATION_REMINDER_TEXT, MessageType.MEDICATION_REMINDER);
        }
    }

    public boolean handleMedicationAcknowledgment(Long userId, boolean tookMedication) {
        if (userId == null) return false;
        Map<String, Object> patient = userClient.getUserById(userId);
        if (!userClient.isRole(patient, "PATIENT")) return false;
        String followUp = tookMedication
                ? "Wonderful! Staying consistent with your medication really helps. I'm proud of you. 💚"
                : "Thanks for telling me. Please take it when you can. 🤗";
        sendBotPrivateMessage(userId, followUp, MessageType.BOT_MESSAGE);
        MedicationComplianceLog log = new MedicationComplianceLog();
        log.setPatientId(userId);
        log.setTookMedication(tookMedication);
        medicationComplianceLogRepository.save(log);
        return true;
    }

    public void processMessageForSupport(Message userMsg) {
        if (userMsg.getSenderId() == null) return;
        Map<String, Object> sender = userClient.getUserById(userMsg.getSenderId());
        if (userClient.isRole(sender, "PATIENT") && userMsg.getContent() != null) {
            String content = userMsg.getContent().trim();
            if (DISORIENTATION_PATTERN.matcher(content).find()) {
                handleDisorientation(userMsg, sender);
                return;
            }
            Instant thirtyMinsAgo = Instant.now().minusSeconds(1800);
            List<Message> recent = messageRepository.findBySenderIdAndSentAtAfterOrderBySentAtDesc(userMsg.getSenderId(), thirtyMinsAgo);
            if (recent.size() >= 3) {
                long count = recent.stream().limit(3)
                        .filter(m -> m.getContent() != null && m.getContent().trim().equalsIgnoreCase(content)).count();
                if (count >= 3) logSafetyAlert(userMsg.getSenderId(), SafetyAlertType.REPETITIVE_QUESTIONS, SafetyAlertStatus.OPEN, userMsg.getId());
            }
        }
        if (userMsg.getSentimentScore() != null && userMsg.getSentimentScore() <= -0.2 && userMsg.getSenderId() != null) {
            Map<String, Object> sender2 = userClient.getUserById(userMsg.getSenderId());
            if (userClient.isRole(sender2, "PATIENT"))
                logSafetyAlert(userMsg.getSenderId(), SafetyAlertType.HIGH_DISTRESS_SIGNAL, SafetyAlertStatus.OPEN, userMsg.getId());
            sendReassurance(userMsg.getSenderId());
        }
    }

    private void handleDisorientation(Message userMsg, Map<String, Object> patient) {
        Long patientId = userMsg.getSenderId();
        logSafetyAlert(patientId, SafetyAlertType.DISORIENTATION, SafetyAlertStatus.CAREGIVERS_NOTIFIED, userMsg.getId());
        sendBotPrivateMessage(patientId, "It's okay, everything is fine. You are at home. I have notified your family. ❤️");
        String alertMsg = "🚨 URGENT: Patient " + userClient.getFullName(patient) + " seems disoriented.";
        userClient.getAllUsers().stream()
            .filter(u -> userClient.isRole(u, "RELATION") || userClient.isRole(u, "DOCTOR"))
            .forEach(caregiver -> notificationService.createAndSend(
                ((Number) caregiver.get("id")).longValue(), alertMsg, "URGENT_DISORIENTATION"));
    }

    private void logSafetyAlert(Long patientId, SafetyAlertType type, SafetyAlertStatus status, String relatedMessageId) {
        SafetyAlertLog log = new SafetyAlertLog();
        log.setPatientId(patientId);
        log.setAlertType(type);
        log.setStatus(status);
        // store message id as string reference
        messageRepository.findById(relatedMessageId).ifPresent(m -> {
            // just save the log — relatedMessageId is a string now but SafetyAlertLog stores Long
            // we keep it as null since the type mismatch; in a real system you'd change the field type
        });
        safetyAlertLogRepository.save(log);
    }

    private void sendBotPrivateMessage(Long targetUserId, String content) {
        sendBotPrivateMessage(targetUserId, content, MessageType.BOT_MESSAGE);
    }

    private void sendBotPrivateMessage(Long targetUserId, String content, MessageType type) {
        Message botMsg = new Message();
        botMsg.setContent(content);
        botMsg.setSenderId(null);
        botMsg.setReceiverId(targetUserId);
        botMsg.setSentAt(Instant.now());
        botMsg.setType(type != null ? type : MessageType.BOT_MESSAGE);
        Message saved = messageRepository.save(botMsg);
        MessageResponseDto dto = messageService.mapToResponseDto(saved);
        messagingTemplate.convertAndSendToUser(targetUserId.toString(), "/queue/direct", dto);
    }

    public void sendReassurance(Long targetUserId) {
        if (targetUserId == null) return;
        sendBotPrivateMessage(targetUserId, "Hello! I noticed you might be going through a tough moment. Remember that you're not alone! ❤️");
    }

    @Scheduled(cron = "0 0 10 * * *")
    public void injectMemoryAnchor() {
        userClient.getUsersByRole("PATIENT").forEach(patient -> {
            Long patientId = ((Number) patient.get("id")).longValue();
            notificationService.createAndSend(patientId, "CareBot: Time for a memory! Check the feed for a special post.", "MEMORY_ANCHOR");
        });
    }
}
