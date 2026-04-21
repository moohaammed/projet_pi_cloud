package esprit.tn.geo.controllers.geo;

import esprit.tn.geo.entities.geo.GeoAlert;
import esprit.tn.geo.entities.geo.SOSRequest;
import esprit.tn.geo.services.geo.GeoAlertService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/alerts")
@CrossOrigin(origins = "http://localhost:4200")
public class GeoAlertController {

    @Autowired private GeoAlertService alertService;

    @GetMapping
    public ResponseEntity<List<GeoAlert>> getAll() {
        return ResponseEntity.ok(alertService.getAll());
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<GeoAlert>> getByPatient(
            @PathVariable Long patientId) {
        return ResponseEntity.ok(alertService.getByPatient(patientId));
    }

    @GetMapping("/non-resolues")
    public ResponseEntity<List<GeoAlert>> getNonResolues() {
        return ResponseEntity.ok(alertService.getNonResolues());
    }

    // id est un String en MongoDB (ObjectId)
    @PatchMapping("/{id}/resoudre")
    public ResponseEntity<GeoAlert> resoudre(@PathVariable String id) {
        return ResponseEntity.ok(alertService.resoudre(id));
    }

    @PostMapping("/sos/patient/{patientId}")
    public ResponseEntity<?> envoyerSOS(
            @PathVariable Long patientId,
            @RequestBody SOSRequest request) {
        alertService.creerAlerteSOS(patientId, request.getLatitude(), request.getLongitude());
        return ResponseEntity.ok("SOS envoyé");
    }

    @PatchMapping("/{id}/confirmer")
    public ResponseEntity<GeoAlert> confirmerVu(@PathVariable String id) {
        return ResponseEntity.ok(alertService.confirmerVu(id));
    }
}
