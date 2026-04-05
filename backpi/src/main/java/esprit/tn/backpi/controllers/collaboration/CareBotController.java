package esprit.tn.backpi.controllers.collaboration;

import esprit.tn.backpi.services.collaboration.CareBotService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/carebot/test")
@CrossOrigin(origins = "http://localhost:4200")
public class CareBotController {

    private final CareBotService careBotService;

    public CareBotController(CareBotService careBotService) {
        this.careBotService = careBotService;
    }

    /**
     * Fires the same medication reminder as the 8:00 AM job.
     * Optional {@code userId}: only that user if they are a PATIENT; otherwise 400.
     * Omit {@code userId} to notify every patient (use sparingly).
     */
    @PostMapping("/trigger-morning")
    public ResponseEntity<String> triggerMorningCheckIn(@RequestParam(required = false) Long userId) {
        if (userId != null) {
            boolean ok = careBotService.sendMedicationReminderToPatient(userId);
            if (!ok) {
                return ResponseEntity.badRequest().body("User not found or not a PATIENT role.");
            }
            return ResponseEntity.ok("Medication reminder sent to patient " + userId + ".");
        }
        careBotService.sendMedicationRemindersToAllPatients();
        return ResponseEntity.ok("Medication reminder sent to all patients.");
    }

    /** Patient answers the medication Yes/No prompt; CareBot sends a follow-up message. */
    @PostMapping("/medication-response")
    public ResponseEntity<String> medicationResponse(
            @RequestParam Long userId,
            @RequestParam boolean tookMedication) {
        boolean ok = careBotService.handleMedicationAcknowledgment(userId, tookMedication);
        if (!ok) {
            return ResponseEntity.badRequest().body("User not found or not a PATIENT role.");
        }
        return ResponseEntity.ok(tookMedication ? "Acknowledged: took medication." : "Acknowledged: not yet.");
    }

    @PostMapping("/trigger-memory")
    public ResponseEntity<String> triggerMemoryAnchor() {
        careBotService.injectMemoryAnchor();
        return ResponseEntity.ok("Memory Anchoring triggered successfully!");
    }
}
