package esprit.tn.backpi.controllers.gestion_patient;

import esprit.tn.backpi.entities.gestion_patient.Notificationpatient;
import esprit.tn.backpi.repositories.gestion_patient.PatientNotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/patient-notification")
@CrossOrigin(originPatterns = "*")
public class PatientNotificationController {

    private final PatientNotificationRepository notificationRepository;

    public PatientNotificationController(PatientNotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @GetMapping("/{patient_id}")
    public List<Notificationpatient> getLatest(@PathVariable("patient_id") Long patientId) {
        return notificationRepository.findTop10ByPatientIdOrderByCreatedAtDesc(patientId);
    }

    @PutMapping("/read/{id}")
    public void markAsRead(@PathVariable("id") Long id) {
        Notificationpatient n = notificationRepository.findById(id).orElseThrow();
        n.setRead(true);
        notificationRepository.save(n);
    }

    @PutMapping("/read-all/{patient_id}")
    public void markAllAsRead(@PathVariable("patient_id") Long patientId) {
        // Since we are using a custom @Query for performance
        notificationRepository.markAllAsReadByPatientId(patientId);
    }

    @GetMapping("/unread-count/{patient_id}")
    public Map<String, Long> getUnreadCount(@PathVariable("patient_id") Long patientId) {
        long count = notificationRepository.countByPatientIdAndIsReadFalse(patientId);
        return Map.of("count", count);
    }
}
