package esprit.tn.backpi.controller;

import esprit.tn.backpi.entity.User;
import esprit.tn.backpi.entity.Role;
import esprit.tn.backpi.repository.UserRepository;
import esprit.tn.backpi.entities.gestion_patient.Patient;
import esprit.tn.backpi.repositories.gestion_patient.PatientRepository;
import esprit.tn.backpi.services.collaboration.ChatGroupService;
import esprit.tn.backpi.services.collaboration.FileStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:4200")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private ChatGroupService chatGroupService;

    @Autowired
    private FileStorageService fileStorageService;

    @PostMapping(value = "/register", consumes = { MediaType.MULTIPART_FORM_DATA_VALUE })
    public ResponseEntity<?> register(
            @ModelAttribute User user,
            @RequestPart(value = "file", required = false) MultipartFile file) {
        
        if (userRepository.existsByEmail(user.getEmail())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email déjà utilisé"));
        }

        if (file != null && !file.isEmpty()) {
            String imageUrl = fileStorageService.storeFile(file);
            user.setImage(imageUrl);
        }

        User saved = userRepository.save(user);
        chatGroupService.assignUserToDefaultGroup(saved);

        // ── If PATIENT role: auto-create a Patient record linked to this user ──
        if (Role.PATIENT.equals(saved.getRole())) {
            Patient patient = new Patient();
            patient.setNom(saved.getNom());
            patient.setPrenom(saved.getPrenom());
            patient.setUser(saved);
            Patient savedPatient = patientRepository.save(patient);
            // Include patientId in the response so the frontend can pre-load the profile
            return ResponseEntity.status(HttpStatus.CREATED).body(
                Map.of(
                    "id",        saved.getId(),
                    "nom",       saved.getNom(),
                    "prenom",    saved.getPrenom(),
                    "email",     saved.getEmail(),
                    "role",      saved.getRole(),
                    "actif",     saved.isActif(),
                    "patientId", savedPatient.getId()
                )
            );
        }

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
                        return ResponseEntity.ok(user);
                    }
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                            .body(Map.of("message", "Mot de passe incorrect"));
                })
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "Email introuvable")));
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
                newUser.setRole(Role.PATIENT);
                newUser.setPassword(java.util.UUID.randomUUID().toString());
                return userRepository.save(newUser);
            });
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Token Google Invalide"));
        }
    }
}
