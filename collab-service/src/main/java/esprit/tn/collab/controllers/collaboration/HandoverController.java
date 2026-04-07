package esprit.tn.collab.controllers.collaboration;

import esprit.tn.collab.services.collaboration.HandoverService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/api/handover")
@CrossOrigin(origins = "http://localhost:4200")
public class HandoverController {

    private final HandoverService handoverService;

    public HandoverController(HandoverService handoverService) { this.handoverService = handoverService; }

    @GetMapping("/group/{groupId}")
    public ResponseEntity<Map<String, String>> getHandoverSummary(@PathVariable Long groupId,
                                                                   @RequestParam(defaultValue = "24") int hours) {
        return ResponseEntity.ok(Collections.singletonMap("summary", handoverService.generateHandoverSummary(groupId, hours)));
    }
}
