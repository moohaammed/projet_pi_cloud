package esprit.tn.patientmedecin.controllers;

import esprit.tn.patientmedecin.entities.RappelQuotidien;
import esprit.tn.patientmedecin.entities.Notificationpatient;
import esprit.tn.patientmedecin.repositories.RappelQuotidienRepository;
import esprit.tn.patientmedecin.repositories.PatientNotificationRepository;
import esprit.tn.patientmedecin.sequence.SequenceGeneratorService;
import esprit.tn.patientmedecin.services.RappelEmailService;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

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
}
