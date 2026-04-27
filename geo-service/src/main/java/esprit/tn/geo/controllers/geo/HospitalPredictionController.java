package esprit.tn.geo.controllers.geo;

import esprit.tn.geo.dto.HospitalPredictionRequest;
import esprit.tn.geo.entities.geo.HospitalPrediction;
import esprit.tn.geo.entities.geo.RecommendedHospital;
import esprit.tn.geo.services.geo.HospitalPredictionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/hospital")
@CrossOrigin(origins = "*")
public class HospitalPredictionController {
    private final HospitalPredictionService hospitalPredictionService;

    public HospitalPredictionController(HospitalPredictionService hospitalPredictionService) {
        this.hospitalPredictionService = hospitalPredictionService;
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

    @GetMapping("/search")
    public ResponseEntity<List<RecommendedHospital>> search(
            @RequestParam(required = false, defaultValue = "") String query,
            @RequestParam(required = false) Double patientLatitude,
            @RequestParam(required = false) Double patientLongitude,
            @RequestParam(required = false) Integer limit) {
        return ResponseEntity.ok(
                hospitalPredictionService.searchDataset(query, patientLatitude, patientLongitude, limit)
        );
    }
}
