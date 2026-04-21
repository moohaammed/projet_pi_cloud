package esprit.tn.patientmedecin.services;

import esprit.tn.patientmedecin.entities.Notificationpatient;
import esprit.tn.patientmedecin.entities.RappelQuotidien;
import esprit.tn.patientmedecin.repositories.PatientNotificationRepository;
import esprit.tn.patientmedecin.repositories.RappelQuotidienRepository;
import esprit.tn.patientmedecin.sequence.SequenceGeneratorService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;

@Service
@Slf4j
public class ReminderScheduler {

    private final RappelQuotidienRepository rappelRepository;
    private final PatientNotificationRepository notificationRepository;
    private final RappelEmailService rappelEmailService;
    private final SequenceGeneratorService sequenceGenerator;

    public ReminderScheduler(RappelQuotidienRepository rappelRepository,
                             PatientNotificationRepository notificationRepository,
                             RappelEmailService rappelEmailService,
                             SequenceGeneratorService sequenceGenerator) {
        this.rappelRepository = rappelRepository;
        this.notificationRepository = notificationRepository;
        this.rappelEmailService = rappelEmailService;
        this.sequenceGenerator = sequenceGenerator;
    }

    @Scheduled(fixedRate = 60000) // Every minute
    public void processReminders() {
        LocalTime now = LocalTime.now().withSecond(0).withNano(0);
        String today = LocalDate.now().getDayOfWeek()
                .getDisplayName(TextStyle.FULL, Locale.FRENCH)
                .toUpperCase();

        List<RappelQuotidien> activeRappels = rappelRepository.findByActifTrue();

        for (RappelQuotidien r : activeRappels) {
            boolean dayMatches = "TOUS".equals(r.getJours()) || r.getJours().contains(today);
            boolean timeMatches = r.getHeureRappel().withSecond(0).withNano(0).equals(now);

            if (dayMatches && timeMatches) {
                createNotification(r);
            }
        }
    }

    private void createNotification(RappelQuotidien r) {
        Notificationpatient notif = new Notificationpatient();
        notif.setId(sequenceGenerator.generateSequence(Notificationpatient.SEQUENCE_NAME));
        notif.setPatient(r.getPatient());
        notif.setType("RAPPEL_QUOTIDIEN");
        notif.setCreatedAt(LocalDateTime.now());

        String emoji = switch (r.getType()) {
            case MEDICAMENT -> "💊";
            case REPAS -> "🍽️";
            case HYGIENE -> "🪥";
            case EXERCICE -> "🏃";
            case SOCIAL -> "👥";
            case AUTRE -> "🔔";
        };

        notif.setMessage(String.format("%s %s — %s (Prévu à %s)", 
                emoji, r.getTitre(), r.getDescription(), r.getHeureRappel()));
        
        notificationRepository.save(notif);
        log.info("[Scheduler] Notification created for patient {}: {}", r.getPatient().getId(), r.getTitre());

        // Send email — errors are caught inside the service and never block this flow
        rappelEmailService.sendScheduledReminderEmail(r);
    }
}
