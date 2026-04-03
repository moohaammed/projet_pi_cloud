package esprit.tn.backpi.controllers.gestion_patient;

import esprit.tn.backpi.entities.gestion_patient.Notificationpatient;
import esprit.tn.backpi.services.gestion_patient.INotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController("patientNotificationController")
@RequestMapping("/api/notifications")
@CrossOrigin(originPatterns = "*")
@RequiredArgsConstructor
public class NotificationController {

    private final INotificationService notificationService;

    @GetMapping
    public List<Notificationpatient> getAllNotifications() {
        return notificationService.retrieveAllNotifications();
    }
}
