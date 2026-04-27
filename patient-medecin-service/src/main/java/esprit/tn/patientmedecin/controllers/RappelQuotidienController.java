package esprit.tn.patientmedecin.controllers;

import esprit.tn.patientmedecin.entities.RappelQuotidien;
import esprit.tn.patientmedecin.entities.Notificationpatient;
import esprit.tn.patientmedecin.repositories.RappelQuotidienRepository;
import esprit.tn.patientmedecin.repositories.PatientNotificationRepository;
import esprit.tn.patientmedecin.sequence.SequenceGeneratorService;
import esprit.tn.patientmedecin.services.RappelEmailService;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rappel-quotidien")
@CrossOrigin(originPatterns = "*")
public class RappelQuotidienController {

    private final RappelQuotidienRepository rappelRepository;
    private final PatientNotificationRepository notificationRepository;
    private final RappelEmailService rappelEmailService;
    private final SequenceGeneratorService sequenceGenerator;

    public RappelQuotidienController(RappelQuotidienRepository rappelRepository,
                                     PatientNotificationRepository notificationRepository,
                                     RappelEmailService rappelEmailService,
                                     SequenceGeneratorService sequenceGenerator) {
        this.rappelRepository = rappelRepository;
        this.notificationRepository = notificationRepository;
        this.rappelEmailService = rappelEmailService;
        this.sequenceGenerator = sequenceGenerator;
    }

    @GetMapping("/patient/{patient_id}")
    public List<RappelQuotidien> getByPatient(@PathVariable("patient_id") Long patientId) {
        return rappelRepository.findByPatient_Id(patientId);
    }

    @PostMapping
    public RappelQuotidien create(@RequestBody RappelQuotidien rappel) {
        if (rappel.getId() == null) {
            rappel.setId(sequenceGenerator.generateSequence(RappelQuotidien.SEQUENCE_NAME));
        }
        if(rappel.getCreatedAt() == null){
            rappel.setCreatedAt(LocalDateTime.now());
        }

        RappelQuotidien saved = rappelRepository.save(rappel);
        
        // Notify patient (in-app notification)
        if (saved.getPatient() != null && saved.getPatient().getId() != null) {
            Notificationpatient notif = new Notificationpatient();
            notif.setId(sequenceGenerator.generateSequence(Notificationpatient.SEQUENCE_NAME));
            notif.setPatient(saved.getPatient());
            notif.setType("RAPPEL_QUOTIDIEN");
            notif.setMessage("Nouveau rappel assigné : " + saved.getTitre() + " à " + saved.getHeureRappel());
            notif.setCreatedAt(LocalDateTime.now());
            notificationRepository.save(notif);
        }

        // Send one-time creation email to patient
        rappelEmailService.sendNewReminderCreatedEmail(saved);
        
        return saved;
    }

    @PutMapping("/{id}")
    public RappelQuotidien update(@PathVariable("id") Long id, @RequestBody RappelQuotidien rappel) {
        rappel.setId(id);
        return rappelRepository.save(rappel);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable("id") Long id) {
        rappelRepository.deleteById(id);
    }

    @PutMapping("/{id}/toggle")
    public RappelQuotidien toggle(@PathVariable("id") Long id) {
        RappelQuotidien rappel = rappelRepository.findById(id).orElseThrow();
        rappel.setActif(!rappel.isActif());
        return rappelRepository.save(rappel);
    }

    @PostMapping("/{id}/voice")
    public ResponseEntity<?> uploadVoice(@PathVariable("id") Long id, @RequestParam("audio") MultipartFile file) {
        RappelQuotidien rappel = rappelRepository.findById(id).orElse(null);
        if (rappel == null) return ResponseEntity.notFound().build();

        try {
            String fileName = "rappel_" + id + ".webm";
            Path uploadPath = Paths.get("..", "uploads", "voice-rappels");
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            Path filePath = uploadPath.resolve(fileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            String voicePath = "uploads/voice-rappels/" + fileName;
            rappel.setVoiceMessagePath(voicePath);
            rappelRepository.save(rappel);

            Map<String, String> response = new HashMap<>();
            response.put("voicePath", voicePath);
            return ResponseEntity.ok(response);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Could not save audio file: " + e.getMessage());
        }
    }

    @GetMapping("/{id}/voice")
    public ResponseEntity<Resource> getVoice(@PathVariable("id") Long id) {
        RappelQuotidien rappel = rappelRepository.findById(id).orElse(null);
        if (rappel == null || rappel.getVoiceMessagePath() == null) return ResponseEntity.notFound().build();

        try {
            Path filePath = Paths.get("..").resolve(rappel.getVoiceMessagePath());
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() || resource.isReadable()) {
                return ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (MalformedURLException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/{id}/summarize")
    public ResponseEntity<?> summarize(@PathVariable("id") Long id) {
        RappelQuotidien rappel = rappelRepository.findById(id).orElse(null);
        if (rappel == null) return ResponseEntity.notFound().build();
        if (rappel.getVoiceMessagePath() == null) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Aucun message vocal disponible");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }

        try {
            RestTemplate restTemplate = new RestTemplate();
            String flaskUrl = "http://localhost:5000/summarize-voice";
            Map<String, String> request = new HashMap<>();
            request.put("voice_path", rappel.getVoiceMessagePath());

            ResponseEntity<Map> response = restTemplate.postForEntity(flaskUrl, request, Map.class);
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Résumé indisponible pour le moment");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @GetMapping("/test-groq")
    public ResponseEntity<?> testGroq() {
        try {
            RestTemplate restTemplate = new RestTemplate();
            String flaskUrl = "http://localhost:5000/test-groq";
            ResponseEntity<Map> response = restTemplate.getForEntity(flaskUrl, Map.class);
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Groq test failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
}
