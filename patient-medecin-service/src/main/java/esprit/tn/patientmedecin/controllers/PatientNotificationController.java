package esprit.tn.patientmedecin.controllers;

import esprit.tn.patientmedecin.entities.Notificationpatient;
import esprit.tn.patientmedecin.services.INotificationService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/patient-notification")
@CrossOrigin(originPatterns = "*")
public class PatientNotificationController {

    private final INotificationService notificationService;

    public PatientNotificationController(INotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping("/{patient_id}")
    public List<Notificationpatient> getLatest(@PathVariable("patient_id") Long patientId) {
        return notificationService.getLatest(patientId);
    }

    @PutMapping("/read/{id}")
    public void markAsRead(@PathVariable("id") Long id) {
        notificationService.markAsRead(id);
    }

    @PutMapping("/read-all/{patient_id}")
    public void markAllAsRead(@PathVariable("patient_id") Long patientId) {
        notificationService.markAllAsRead(patientId);
    }

    @GetMapping("/unread-count/{patient_id}")
    public Map<String, Long> getUnreadCount(@PathVariable("patient_id") Long patientId) {
        return notificationService.getUnreadCount(patientId);
    }
}
