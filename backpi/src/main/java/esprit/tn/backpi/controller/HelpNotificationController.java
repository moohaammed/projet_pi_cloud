package esprit.tn.backpi.controller;

import esprit.tn.backpi.service.HelpNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/help-notifications")
@CrossOrigin(origins = "http://localhost:4200")
public class HelpNotificationController {

    @Autowired
    private HelpNotificationService helpNotificationService;

    @PostMapping("/send")
    public ResponseEntity<?> sendHelpNotification(@RequestParam Long userId) {
        try {
            Map<String, Object> result = helpNotificationService.sendHelpNotification(userId);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        }
    }
}
