package esprit.tn.backpi.controller;

import esprit.tn.backpi.dto.AnalysisRequest;
import esprit.tn.backpi.dto.AnalysisResponse;
import esprit.tn.backpi.service.OpenRouterService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
public class AiAnalysisController {

    private final OpenRouterService openRouterService;

    public AiAnalysisController(OpenRouterService openRouterService) {
        this.openRouterService = openRouterService;
    }

    @PostMapping("/analyze")
    public ResponseEntity<?> analyze(@RequestBody AnalysisRequest request) {
        try {
            String result = openRouterService.analyze(request);
            return ResponseEntity.ok(new AnalysisResponse(result));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }
}
