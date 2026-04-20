package esprit.tn.backpi.controllers.gestion_patient;

import esprit.tn.backpi.entities.gestion_patient.RappelQuotidien;
import esprit.tn.backpi.entities.gestion_patient.Notificationpatient;
import esprit.tn.backpi.repositories.gestion_patient.RappelQuotidienRepository;
import esprit.tn.backpi.repositories.gestion_patient.PatientNotificationRepository;
import esprit.tn.backpi.services.gestion_patient.RappelEmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rappel-quotidien")
@CrossOrigin(originPatterns = "*")
public class RappelQuotidienController {

    private final RappelQuotidienRepository rappelRepository;
    private final PatientNotificationRepository notificationRepository;
    private final RappelEmailService rappelEmailService;

    public RappelQuotidienController(RappelQuotidienRepository rappelRepository,
                                     PatientNotificationRepository notificationRepository,
                                     RappelEmailService rappelEmailService) {
        this.rappelRepository = rappelRepository;
        this.notificationRepository = notificationRepository;
        this.rappelEmailService = rappelEmailService;
    }

    @GetMapping("/patient/{patient_id}")
    public List<RappelQuotidien> getByPatient(@PathVariable("patient_id") Long patientId) {
        return rappelRepository.findByPatientId(patientId);
    }

    @PostMapping
    public RappelQuotidien create(@RequestBody RappelQuotidien rappel) {
        RappelQuotidien saved = rappelRepository.save(rappel);
        
        // Notify patient (in-app notification)
        if (saved.getPatient() != null && saved.getPatient().getId() != null) {
            Notificationpatient notif = new Notificationpatient();
            notif.setPatient(saved.getPatient());
            notif.setType("RAPPEL_QUOTIDIEN");
            notif.setMessage("Nouveau rappel assigné : " + saved.getTitre() + " à " + saved.getHeureRappel());
            notificationRepository.save(notif);
        }

        // Send one-time creation email to patient (errors caught inside service, never block response)
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
