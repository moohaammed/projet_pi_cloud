package esprit.tn.backpi.controllers.collaboration;

import esprit.tn.backpi.services.collaboration.HandoverService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/api/handover")
public class HandoverController {

    private final HandoverService handoverService;

    public HandoverController(HandoverService handoverService) {
        this.handoverService = handoverService;
    }

    @GetMapping("/group/{groupId}")
    public ResponseEntity<Map<String, String>> getHandoverSummary(
            @PathVariable Long groupId,
            @RequestParam(defaultValue = "24") int hours) {
        String summary = handoverService.generateHandoverSummary(groupId, hours);
        return ResponseEntity.ok(Collections.singletonMap("summary", summary));
    }
}
