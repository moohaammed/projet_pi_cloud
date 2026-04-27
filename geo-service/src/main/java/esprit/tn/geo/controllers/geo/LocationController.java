package esprit.tn.geo.controllers.geo;

import esprit.tn.geo.dto.LocationPredictionRequest;
import esprit.tn.geo.dto.LocationPredictionResponse;
import esprit.tn.geo.entities.geo.LocationRecognition;
import esprit.tn.geo.services.geo.LocationRecognitionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/location")
@CrossOrigin(origins = "*")
public class LocationController {
    private final LocationRecognitionService locationRecognitionService;

    public LocationController(LocationRecognitionService locationRecognitionService) {
        this.locationRecognitionService = locationRecognitionService;
    }

    @PostMapping("/predict")
    public ResponseEntity<LocationPredictionResponse> predict(@RequestBody LocationPredictionRequest request) {
        return ResponseEntity.ok(locationRecognitionService.predict(request));
    }

    @GetMapping("/current/{patientId}")
    public ResponseEntity<LocationRecognition> current(@PathVariable Long patientId) {
        return ResponseEntity.ok(locationRecognitionService.getCurrent(patientId));
    }

    @GetMapping("/history/{patientId}")
    public ResponseEntity<List<LocationRecognition>> history(@PathVariable Long patientId) {
        return ResponseEntity.ok(locationRecognitionService.getHistory(patientId));
    }
}
