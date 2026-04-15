package esprit.tn.backpi.controller;
import esprit.tn.backpi.entity.GeoAlert;
import esprit.tn.backpi.service.GeoAlertService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import esprit.tn.backpi.entity.SOSRequest;

@RestController
@RequestMapping("/api/alerts")
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

    @PatchMapping("/{id}/resoudre")
    public ResponseEntity<GeoAlert> resoudre(@PathVariable Long id) {
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
    public ResponseEntity<GeoAlert> confirmerVu(@PathVariable Long id) {
        return ResponseEntity.ok(alertService.confirmerVu(id));
    }
}
