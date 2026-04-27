package esprit.tn.geo.controllers.geo;

import esprit.tn.geo.dto.HospitalPredictionRequest;
import esprit.tn.geo.entities.geo.Hospital;
import esprit.tn.geo.entities.geo.HospitalPrediction;
import esprit.tn.geo.services.geo.HospitalPredictionService;
import esprit.tn.geo.services.geo.HospitalService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/hospitals")
@CrossOrigin(origins = "http://localhost:4200")
public class HospitalController {

    private final HospitalService hospitalService;
    private final HospitalPredictionService hospitalPredictionService;

    public HospitalController(HospitalService hospitalService, HospitalPredictionService hospitalPredictionService) {
        this.hospitalService = hospitalService;
        this.hospitalPredictionService = hospitalPredictionService;
    }

    @GetMapping
    public List<Hospital> getAll() {
        return hospitalService.getAll();
    }

    // id est un String en MongoDB (ObjectId)
    @GetMapping("/{id}")
    public ResponseEntity<Hospital> getById(@PathVariable String id) {
        Hospital h = hospitalService.getById(id);
        return h != null ? ResponseEntity.ok(h) : ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<Hospital> create(@RequestBody Hospital hospital) {
        return ResponseEntity.ok(hospitalService.create(hospital));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Hospital> update(@PathVariable String id,
                                           @RequestBody Hospital hospital) {
        Hospital updated = hospitalService.update(id, hospital);
        return updated != null ? ResponseEntity.ok(updated) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        hospitalService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/predict")
    public ResponseEntity<HospitalPrediction> predict(@RequestBody HospitalPredictionRequest request) {
        return ResponseEntity.ok(hospitalPredictionService.predictAndSave(request));
    }

    @GetMapping("/prediction/latest/{patientId}")
    public ResponseEntity<HospitalPrediction> latestForPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(hospitalPredictionService.getLatestForPatient(patientId));
    }

    @GetMapping("/prediction/latest")
    public ResponseEntity<List<HospitalPrediction>> latestAlerts() {
        return ResponseEntity.ok(hospitalPredictionService.getLatestAlerts());
    }
}
