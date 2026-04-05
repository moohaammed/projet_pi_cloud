package esprit.tn.backpi.controller;

import esprit.tn.backpi.entity.User;
import esprit.tn.backpi.repository.UserRepository;
import esprit.tn.backpi.services.collaboration.ChatGroupService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:4200")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ChatGroupService chatGroupService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        if (userRepository.existsByEmail(user.getEmail())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email déjà utilisé"));
        }
        User saved = userRepository.save(user);
        chatGroupService.assignUserToDefaultGroup(saved);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginRequest) {
        return userRepository.findByEmail(loginRequest.getEmail())
                .map(user -> {
                    if (!user.isActif()) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body(Map.of("message", "Ce compte est suspendu"));
                    }
                    if (user.getPassword().equals(loginRequest.getPassword())) {
                        // Ensure user is in their default group
                        chatGroupService.assignUserToDefaultGroup(user);
                        return ResponseEntity.ok(user);
                    }
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                            .body(Map.of("message", "Mot de passe incorrect"));
                })
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "Email introuvable")));
    }
}