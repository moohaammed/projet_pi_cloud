package esprit.tn.backpi.services.collaboration;

import esprit.tn.backpi.dto.collaboration.MessageResponseDto;
import esprit.tn.backpi.entities.collaboration.admin.MedicationComplianceLog;
import esprit.tn.backpi.entities.collaboration.admin.SafetyAlertLog;
import esprit.tn.backpi.entities.collaboration.admin.SafetyAlertStatus;
import esprit.tn.backpi.entities.collaboration.admin.SafetyAlertType;
import esprit.tn.backpi.entities.collaboration.Message;
import esprit.tn.backpi.entities.collaboration.MessageType;
import esprit.tn.backpi.entities.collaboration.Publication;
import esprit.tn.backpi.entities.collaboration.PublicationType;
import esprit.tn.backpi.entity.Role;
import esprit.tn.backpi.entity.User;
import esprit.tn.backpi.repositories.collaboration.admin.MedicationComplianceLogRepository;
import esprit.tn.backpi.repositories.collaboration.admin.SafetyAlertLogRepository;
import esprit.tn.backpi.repositories.collaboration.MessageRepository;
import esprit.tn.backpi.repositories.collaboration.PublicationRepository;
import esprit.tn.backpi.repository.UserRepository;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.regex.Pattern;

@Service
public class CareBotService {

    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final PublicationRepository publicationRepository;
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
                          UserRepository userRepository,
                          PublicationRepository publicationRepository,
                          @Lazy MessageService messageService,
                          SafetyAlertLogRepository safetyAlertLogRepository,
                          MedicationComplianceLogRepository medicationComplianceLogRepository) {
        this.messagingTemplate = messagingTemplate;
        this.notificationService = notificationService;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.publicationRepository = publicationRepository;
        this.messageService = messageService;
        this.safetyAlertLogRepository = safetyAlertLogRepository;
        this.medicationComplianceLogRepository = medicationComplianceLogRepository;
    }

    // 1. MORNING CHECK-IN: Runs every day at 8:00 AM
    @Scheduled(cron = "0 0 8 * * *")
    @Transactional
    public void morningCheckIn() {
        System.out.println("CARE-BOT [Scheduled]: Starting Morning Check-in");
        sendMedicationRemindersTo(userRepository.findByRole(Role.PATIENT));
    }

    /** Manual / test: all patients (same as the daily job). */
    @Transactional
    public void sendMedicationRemindersToAllPatients() {
        sendMedicationRemindersTo(userRepository.findByRole(Role.PATIENT));
    }

    /**
     * Manual / test: one patient only. Returns false if the user does not exist or is not {@link Role#PATIENT}.
     */
    @Transactional
    public boolean sendMedicationReminderToPatient(Long userId) {
        if (userId == null) return false;
        return userRepository.findById(userId)
                .filter(u -> u.getRole() == Role.PATIENT)
                .map(u -> {
                    sendMedicationRemindersTo(Collections.singletonList(u));
                    return true;
                })
                .orElse(false);
    }

    private void sendMedicationRemindersTo(List<User> patients) {
        for (User patient : patients) {
            sendBotPrivateMessage(patient, MEDICATION_REMINDER_TEXT, MessageType.MEDICATION_REMINDER);
        }
    }

    /**
     * After the patient taps Yes/No on a medication reminder, send an appropriate follow-up.
     */
    @Transactional
    public boolean handleMedicationAcknowledgment(Long userId, boolean tookMedication) {
        if (userId == null) return false;
        User patient = userRepository.findById(userId)
                .filter(u -> u.getRole() == Role.PATIENT)
                .orElse(null);
        if (patient == null) return false;

        String followUp = tookMedication
                ? "Wonderful! Staying consistent with your medication really helps. I'm proud of you. 💚"
                : "Thanks for telling me. Please take it when you can. If you often forget, ask a family member or set a reminder—and talk to your doctor if you have questions. 🤗";
        sendBotPrivateMessage(patient, followUp, MessageType.BOT_MESSAGE);

        MedicationComplianceLog log = new MedicationComplianceLog();
        log.setPatient(patient);
        log.setTookMedication(tookMedication);
        medicationComplianceLogRepository.save(log);
        return true;
    }

    // 2. MEMORY ANCHORING: Runs every day at 10:00 AM (Feed Injection)
    @Scheduled(cron = "0 0 10 * * *")
    @Transactional
    public void injectMemoryAnchor() {
        System.out.println("CARE-BOT [Scheduled]: Injecting Memory Anchor");
        List<Publication> memoryPosts = publicationRepository.findByType(PublicationType.MEMORY_ANCHOR);
        if (memoryPosts.isEmpty()) return;

        // Select a random memory post
        Publication memory = memoryPosts.get(new Random().nextInt(memoryPosts.size()));
        
        // Push a fresh notification to all patients about this memory
        List<User> patients = userRepository.findByRole(Role.PATIENT);
        for (User patient : patients) {
            notificationService.createAndSend(
                patient.getId(),
                "CareBot: Time for a memory! Look at this: " + memory.getContent(),
                "MEMORY_ANCHOR"
            );
        }
    }

    public void processMessageForSupport(Message userMsg) {
        User sender = userMsg.getSender();
        if (sender != null && sender.getRole() == Role.PATIENT && userMsg.getContent() != null) {
            String content = userMsg.getContent().trim();
            
            // 1. Disorientation Check
            if (DISORIENTATION_PATTERN.matcher(content).find()) {
                handleDisorientation(userMsg);
                return;
            }

            // 2. Repetition Check (3 identical messages in last 30 mins)
            Instant thirtyMinsAgo = Instant.now().minusSeconds(1800);
            List<Message> recent = messageRepository.findBySenderIdAndSentAtAfterOrderBySentAtDesc(sender.getId(), thirtyMinsAgo);
            if (recent.size() >= 3) {
                long count = recent.stream()
                        .limit(3)
                        .filter(m -> m.getContent() != null && m.getContent().trim().equalsIgnoreCase(content))
                        .count();
                if (count >= 3) {
                    logSafetyAlert(sender, SafetyAlertType.REPETITIVE_QUESTIONS, SafetyAlertStatus.OPEN, userMsg.getId());
                    System.out.println("CARE-BOT [Alert]: Repetition detected for Patient " + sender.getId());
                }
            }
        }

        // 3. Emotional Distress check (Sentiment)
        if (userMsg.getSentimentScore() != null && userMsg.getSentimentScore() <= -0.2) {
            if (sender != null && sender.getRole() == Role.PATIENT) {
                logSafetyAlert(sender, SafetyAlertType.HIGH_DISTRESS_SIGNAL, SafetyAlertStatus.OPEN, userMsg.getId());
            }
            if (sender != null) {
                sendReassurance(sender);
            }
        }
    }

    private void handleDisorientation(Message userMsg) {
        User patient = userMsg.getSender();
        System.out.println("CARE-BOT [Alert]: Disorientation detected for Patient " + patient.getId());

        logSafetyAlert(patient, SafetyAlertType.DISORIENTATION, SafetyAlertStatus.CAREGIVERS_NOTIFIED, userMsg.getId());

        // a) Reply privately
        sendBotPrivateMessage(patient, "It's okay, everything is fine. You are at home. I have notified your family. ❤️");

        // b) Trigger Urgent Notification to FAMILY and DOCTOR (using collaboration notifications)
        String alertMsg = "🚨 URGENT: Patient " + patient.getPrenom() + " " + patient.getNom() + 
                         " seems disoriented. Message: \"" + userMsg.getContent() + "\"";
        
        // Notify family and doctors using the collaboration notification system
        List<User> caregivers = userRepository.findAll().stream()
            .filter(u -> u.getRole() == Role.RELATION || u.getRole() == Role.DOCTOR)
            .toList();

        for (User caregiver : caregivers) {
            notificationService.createAndSend(caregiver.getId(), alertMsg, "URGENT_DISORIENTATION");
        }
    }

    private void logSafetyAlert(User patient, SafetyAlertType type, SafetyAlertStatus status, Long relatedMessageId) {
        SafetyAlertLog log = new SafetyAlertLog();
        log.setPatient(patient);
        log.setAlertType(type);
        log.setStatus(status);
        log.setRelatedMessageId(relatedMessageId);
        safetyAlertLogRepository.save(log);
    }

    private void sendBotPrivateMessage(User targetUser, String content) {
        sendBotPrivateMessage(targetUser, content, MessageType.BOT_MESSAGE);
    }

    private void sendBotPrivateMessage(User targetUser, String content, MessageType type) {
        Message botMsg = new Message();
        botMsg.setContent(content);
        botMsg.setSender(null);
        botMsg.setReceiver(targetUser);
        botMsg.setSentAt(Instant.now());
        botMsg.setType(type != null ? type : MessageType.BOT_MESSAGE);

        Message saved = messageRepository.save(botMsg);
        MessageResponseDto dto = messageService.mapToResponseDto(saved);

        messagingTemplate.convertAndSendToUser(
            targetUser.getId().toString(),
            "/queue/direct",
            dto
        );
    }

    public void sendReassurance(User targetUser) {
        if (targetUser == null || targetUser.getId() == null) return;
        sendBotPrivateMessage(targetUser, "Hello! I noticed you might be going through a tough moment. Remember that you're not alone and we're here to support you! ❤️");
    }
}
