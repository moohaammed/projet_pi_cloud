package esprit.tn.collab.controllers.collaboration;

import esprit.tn.collab.dto.collaboration.HandoverDTO;
import esprit.tn.collab.services.collaboration.CareRelayService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/care-relay")
@CrossOrigin(origins = "http://localhost:4200")
public class CareRelayController {

    private final CareRelayService careRelayService;

    public CareRelayController(CareRelayService careRelayService) { this.careRelayService = careRelayService; }

    
    @GetMapping("/handover")
    public ResponseEntity<HandoverDTO> getHandoverSummary(@RequestParam String groupId,
                                                           @RequestParam(defaultValue = "8") int hours) {
        return ResponseEntity.ok(careRelayService.generateHandoverSummary(groupId, hours));
    }
}
