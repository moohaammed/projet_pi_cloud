package esprit.tn.backpi.controller;

import esprit.tn.backpi.entity.PatientLocation;
import esprit.tn.backpi.service.PatientLocationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/locations")
@CrossOrigin(origins = "http://localhost:4200")
public class PatientLocationController {

    @Autowired private PatientLocationService locationService;

    // Envoyer position GPS (appelé par l'app patient)
    @PostMapping("/patient/{patientId}")
    public ResponseEntity<PatientLocation> saveLocation(
            @PathVariable Long patientId,
            @RequestBody Map<String, Object> body) {

        Double lat = Double.valueOf(body.get("latitude").toString());
        Double lng = Double.valueOf(body.get("longitude").toString());
        Integer bat = body.get("batterie") != null
                ? Integer.valueOf(body.get("batterie").toString()) : null;

        return ResponseEntity.ok(locationService.saveLocation(patientId, lat, lng, bat));
    }

    // Dernière position d'un patient
    @GetMapping("/patient/{patientId}/last")
    public ResponseEntity<?> getLastLocation(@PathVariable Long patientId) {
        return locationService.getLastLocation(patientId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Historique des positions
    @GetMapping("/patient/{patientId}/history")
    public ResponseEntity<List<PatientLocation>> getHistory(
            @PathVariable Long patientId) {
        return ResponseEntity.ok(locationService.getHistory(patientId));
    }
}
