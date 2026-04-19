package esprit.tn.backpi.controller;

import esprit.tn.backpi.service.AiPredictionService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/ai")
@CrossOrigin
public class AiController {

    private final AiPredictionService service;

    public AiController(AiPredictionService service) {
        this.service = service;
    }

    @PostMapping("/predict-cdr")
    public Double predict(@RequestBody Map<String, Object> input) {
        return service.predict(input);
    }
    @PostMapping("/predict-risk")
    public Map<String, Object> predictRisk(@RequestBody Map<String, Object> input) {
        return service.predictRisk(input);
    }
}

