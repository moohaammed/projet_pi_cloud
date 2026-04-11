package esprit.tn.collab.controllers.collaboration;

import esprit.tn.collab.services.collaboration.CareBotService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/carebot/test")
@CrossOrigin(origins = "http://localhost:4200")
public class CareBotController {

    private final CareBotService careBotService;

    public CareBotController(CareBotService careBotService) { this.careBotService = careBotService; }

    @PostMapping("/trigger-morning")
    public ResponseEntity<String> triggerMorningCheckIn(@RequestParam(required = false) Long userId) {
        if (userId != null) {
            boolean ok = careBotService.sendMedicationReminderToPatient(userId);
            return ok ? ResponseEntity.ok("Medication reminder sent to patient " + userId + ".")
                      : ResponseEntity.badRequest().body("User not found or not a PATIENT role.");
        }
        careBotService.sendMedicationRemindersToAllPatients();
        return ResponseEntity.ok("Medication reminder sent to all patients.");
    }

    @PostMapping("/medication-response")
    public ResponseEntity<String> medicationResponse(@RequestParam Long userId, @RequestParam boolean tookMedication) {
        boolean ok = careBotService.handleMedicationAcknowledgment(userId, tookMedication);
        return ok ? ResponseEntity.ok(tookMedication ? "Acknowledged: took medication." : "Acknowledged: not yet.")
                  : ResponseEntity.badRequest().body("User not found or not a PATIENT role.");
    }

    @PostMapping("/trigger-memory")
    public ResponseEntity<String> triggerMemoryAnchor() {
        careBotService.injectMemoryAnchor();
        return ResponseEntity.ok("Memory Anchoring triggered successfully!");
    }
}
