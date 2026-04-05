package esprit.tn.backpi.controller;

import esprit.tn.backpi.entity.User;
import esprit.tn.backpi.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:4200")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        if (userRepository.existsByEmail(user.getEmail())) {
            return ResponseEntity.badRequest().body("Email déjà utilisé");
        }
        User saved = userRepository.save(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginRequest) {
        return userRepository.findByEmail(loginRequest.getEmail())
                .map(user -> {
                    if (user.getPassword().equals(loginRequest.getPassword())) {
                        return ResponseEntity.ok(user);
                    }
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                            .body("Mot de passe incorrect");
                })
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("Email introuvable"));
    }

    @Autowired
    private org.springframework.mail.javamail.JavaMailSender mailSender;

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        return userRepository.findByEmail(email).map(user -> {
            try {
                org.springframework.mail.SimpleMailMessage message = new org.springframework.mail.SimpleMailMessage();
                message.setTo(email);
                message.setSubject("Réinitialisation de votre mot de passe - AlzCare");
                
                // On génère un mot de passe temporaire pour simplifier la maquette
                String tempPassword = java.util.UUID.randomUUID().toString().substring(0, 8);
                user.setPassword(tempPassword);
                userRepository.save(user);

                message.setText("Bonjour " + user.getNom() + ",\n\n"
                        + "Voici votre nouveau mot de passe temporaire : " + tempPassword + "\n\n"
                        + "Veuillez vous connecter avec celui-ci et le changer dès que possible dans votre profil.\n\n"
                        + "L'équipe AlzCare.");
                        
                mailSender.send(message);
                System.out.println("Lien de réinitialisation envoyé physiquement à : " + email);
                return ResponseEntity.ok(Map.of("message", "Mot de passe envoyé par email avec succès."));
            } catch (Exception e) {
                e.printStackTrace();
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(Map.of("message", "Erreur lors de l'envoi de l'email : vérifiez votre configuration SMTP."));
            }
        }).orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", "Email introuvable dans notre système")));
    }

    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@RequestBody Map<String, String> request) {
        String token = request.get("token");
        try {
            // Decode Google JWT sans vérification stricte de signature pour simplicité de maquette
            String[] chunks = token.split("\\.");
            java.util.Base64.Decoder decoder = java.util.Base64.getUrlDecoder();
            String payload = new String(decoder.decode(chunks[1]));
            
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            Map<String, Object> payloadMap = mapper.readValue(payload, Map.class);
            
            String email = (String) payloadMap.get("email");
            String name = (String) payloadMap.get("name");

            User user = userRepository.findByEmail(email).orElseGet(() -> {
                User newUser = new User();
                newUser.setEmail(email);

                // Split Google's full name into nom + prenom
                String[] nameParts = name != null ? name.split(" ", 2) : new String[]{"", ""};
                newUser.setPrenom(nameParts[0]);                                      // First name
                newUser.setNom(nameParts.length > 1 ? nameParts[1] : nameParts[0]);  // Last name

                newUser.setActif(true);
                newUser.setRole(esprit.tn.backpi.entity.Role.PATIENT);
                newUser.setPassword(java.util.UUID.randomUUID().toString());
                return userRepository.save(newUser);
            });
            chatGroupService.assignUserToDefaultGroup(user);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Token Google Invalide"));
        }
    }
}