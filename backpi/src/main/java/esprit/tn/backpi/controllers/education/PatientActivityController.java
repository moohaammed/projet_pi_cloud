package esprit.tn.backpi.controllers.education;

import esprit.tn.backpi.dto.PatientActivitySubmitDto;
import esprit.tn.backpi.dto.ScoreStadeDto;
import esprit.tn.backpi.entities.education.PatientActivity;
import esprit.tn.backpi.services.education.PatientActivityService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/patient-activity")
@CrossOrigin(origins = "http://localhost:4200")
public class PatientActivityController {

    @Autowired
    private PatientActivityService patientActivityService;

    @PostMapping("/submit")
    public ResponseEntity<PatientActivity> submitSession(@RequestBody PatientActivitySubmitDto dto) {
        return ResponseEntity.ok(patientActivityService.submitSession(dto));
    }

    @GetMapping("/score/{userId}")
    public ResponseEntity<ScoreStadeDto> getScoreAndStade(@PathVariable Long userId) {
        return ResponseEntity.ok(patientActivityService.getPatientScoreAndStade(userId));
    }

    @GetMapping("/history/{userId}")
    public ResponseEntity<List<PatientActivity>> getHistory(@PathVariable Long userId) {
        return ResponseEntity.ok(patientActivityService.getPatientHistory(userId));
    }

    @PutMapping("/reset/{userId}")
    public ResponseEntity<Void> resetPatient(
            @PathVariable Long userId,
            @RequestParam(required = false, defaultValue = "ALL") String type) {
        patientActivityService.resetPatient(userId, type);
        return ResponseEntity.ok().build();
    }
}
