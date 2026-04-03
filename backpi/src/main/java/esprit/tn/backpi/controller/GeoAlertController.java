package esprit.tn.backpi.config;
import esprit.tn.backpi.entity.GeoAlert;
import esprit.tn.backpi.service.GeoAlertService;
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

    @PatchMapping("/{id}/resoudre")
    public ResponseEntity<GeoAlert> resoudre(@PathVariable Long id) {
        return ResponseEntity.ok(alertService.resoudre(id));
    }
}
