package esprit.tn.backpi.controller;

import esprit.tn.backpi.entity.Role;
import esprit.tn.backpi.entity.User;
import esprit.tn.backpi.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import esprit.tn.backpi.repository.UserRepository;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(originPatterns = "*")
public class UserController {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    // GET ALL
    @GetMapping
    public ResponseEntity<List<User>> getAll() {
        return ResponseEntity.ok(userService.findAll());
    }

    // GET BY ID
    @GetMapping("/{id}")
    public ResponseEntity<User> getById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.findById(id));
    }

    // GET BY ROLE
    @GetMapping("/role/{role}")
    public ResponseEntity<List<User>> getByRole(@PathVariable Role role) {
        return ResponseEntity.ok(userService.findByRole(role));
    }

    // CREATE
    @PostMapping
    public ResponseEntity<User> create(@RequestBody User user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(userService.create(user));
    }

    // UPDATE
    @PutMapping("/{id}")
    public ResponseEntity<User> update(@PathVariable Long id,
                                       @RequestBody User user) {
        return ResponseEntity.ok(userService.update(id, user));
    }

    // TOGGLE ACTIF
    @PatchMapping("/{id}/toggle")
    public ResponseEntity<User> toggleActif(@PathVariable Long id) {
        return ResponseEntity.ok(userService.toggleActif(id));
    }

    // TOGGLE LIVE
    @PostMapping("/{id}/toggle-live")
    public ResponseEntity<User> toggleLive(@PathVariable Long id) {
        User user = userService.toggleLive(id);
        String status = user.isLive() ? "Live Started" : "Live Ended";
        java.util.Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("userId", id);
        payload.put("userName", user.getNom() + " " + user.getPrenom());
        payload.put("status", status);
        messagingTemplate.convertAndSend("/topic/live-status", payload);
        return ResponseEntity.ok(user);
    }

    // DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            userService.delete(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("User non trouvé id: " + id);
        }
    }

    // ── FCM TOKEN : save user fcm token ──────────────────────────────────────
    @PatchMapping("/{id}/fcm-token")
    public ResponseEntity<?> saveFcmToken(@PathVariable Long id, @RequestBody Map<String, String> body) {
        try {
            User user = userService.findById(id);
            if (body.containsKey("fcmToken")) {
                user.setFcmToken(body.get("fcmToken"));
                userRepository.save(user);
            }
            return ResponseEntity.ok(user);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }
}
