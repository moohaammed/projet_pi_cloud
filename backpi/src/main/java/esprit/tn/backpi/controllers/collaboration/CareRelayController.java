package esprit.tn.backpi.controllers.collaboration;

import esprit.tn.backpi.dto.collaboration.HandoverDTO;
import esprit.tn.backpi.services.collaboration.CareRelayService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/care-relay")
public class CareRelayController {

    private final CareRelayService careRelayService;

    public CareRelayController(CareRelayService careRelayService) {
        this.careRelayService = careRelayService;
    }

    /**
     * GET /api/care-relay/handover?groupId=1&hours=8
     *
     * Generates a shift-handover summary for the given group
     * covering the last N hours of activity.
     */
    @GetMapping("/handover")
    public ResponseEntity<HandoverDTO> getHandoverSummary(
            @RequestParam Long groupId,
            @RequestParam(defaultValue = "8") int hours) {
        HandoverDTO summary = careRelayService.generateHandoverSummary(groupId, hours);
        return ResponseEntity.ok(summary);
    }
}
