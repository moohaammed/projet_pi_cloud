package esprit.tn.backpi.services.gestion_patient;

import esprit.tn.backpi.entities.gestion_patient.Notificationpatient;
import esprit.tn.backpi.entities.gestion_patient.RappelQuotidien;
import esprit.tn.backpi.repositories.gestion_patient.PatientNotificationRepository;
import esprit.tn.backpi.repositories.gestion_patient.RappelQuotidienRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
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

    public ReminderScheduler(RappelQuotidienRepository rappelRepository,
                             PatientNotificationRepository notificationRepository,
                             RappelEmailService rappelEmailService) {
        this.rappelRepository = rappelRepository;
        this.notificationRepository = notificationRepository;
        this.rappelEmailService = rappelEmailService;
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
        notif.setPatient(r.getPatient());
        notif.setType("RAPPEL_QUOTIDIEN");

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
