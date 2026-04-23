package esprit.tn.collab.controllers.collaboration;

import esprit.tn.collab.dto.collaboration.GuidanceResponseDto;
import esprit.tn.collab.dto.collaboration.VoicePromptRequestDto;
import esprit.tn.collab.services.collaboration.GuidanceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/guidance")
@CrossOrigin(origins = "http://localhost:4200")
public class GuidanceController {

    private final GuidanceService guidanceService;

    public GuidanceController(GuidanceService guidanceService) {
        this.guidanceService = guidanceService;
    }

    
    @GetMapping("/{pageName}")
    public ResponseEntity<GuidanceResponseDto> getGuidance(@PathVariable String pageName) {
        return ResponseEntity.ok(guidanceService.getGuidanceForPage(pageName));
    }

    
    @GetMapping
    public ResponseEntity<List<GuidanceResponseDto>> getAllGuidance() {
        return ResponseEntity.ok(guidanceService.getAllGuidance());
    }

    
    @PutMapping("/{pageName}")
    public ResponseEntity<GuidanceResponseDto> upsertGuidance(
            @PathVariable String pageName,
            @RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<String> instructions = (List<String>) body.get("instructions");
        String pageLabel = (String) body.get("pageLabel");
        Long caregiverId = Long.valueOf(body.get("caregiverId").toString());

        try {
            return ResponseEntity.ok(guidanceService.upsertGuidance(pageName, instructions, pageLabel, caregiverId));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).build();
        }
    }

    
    @DeleteMapping("/{pageName}")
    public ResponseEntity<Void> deleteGuidance(
            @PathVariable String pageName,
            @RequestParam Long caregiverId) {
        try {
            guidanceService.deleteGuidance(pageName, caregiverId);
            return ResponseEntity.noContent().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(403).build();
        }
    }

    
    @PostMapping("/voice-prompt")
    public ResponseEntity<Map<String, String>> sendVoicePrompt(
            @RequestBody VoicePromptRequestDto request) {
        try {
            guidanceService.sendVoicePrompt(request);
            return ResponseEntity.ok(Map.of("status", "sent"));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    
    @PostMapping("/simplify")
    public ResponseEntity<Map<String, String>> simplify(@RequestBody Map<String, String> body) {
        String raw = body.getOrDefault("text", "");
        return ResponseEntity.ok(Map.of("simplified", guidanceService.simplifyForTts(raw)));
    }
}
