package esprit.tn.backpi.controller;


import esprit.tn.backpi.entity.SafeZone;
import esprit.tn.backpi.service.SafeZoneService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/safezones")
@CrossOrigin(origins = "http://localhost:4200")
public class SafeZoneController {

    @Autowired private SafeZoneService safeZoneService;

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<SafeZone>> getByPatient(
            @PathVariable Long patientId) {
        return ResponseEntity.ok(safeZoneService.getByPatient(patientId));
    }

    @PostMapping("/patient/{patientId}/doctor/{doctorId}")
    public ResponseEntity<SafeZone> create(
            @PathVariable Long patientId,
            @PathVariable Long doctorId,
            @RequestBody SafeZone zone) {
        return ResponseEntity.ok(safeZoneService.create(zone, patientId, doctorId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SafeZone> update(
            @PathVariable Long id,
            @RequestBody SafeZone zone) {
        return ResponseEntity.ok(safeZoneService.update(id, zone));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        safeZoneService.delete(id);
        return ResponseEntity.noContent().build();
    }
}