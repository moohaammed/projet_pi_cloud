package esprit.tn.patientmedecin.controllers;

import esprit.tn.patientmedecin.entities.Patient;
import esprit.tn.patientmedecin.repositories.PatientRepository;
import esprit.tn.patientmedecin.services.IPatientService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/patients")
@CrossOrigin(originPatterns = "*")
public class PatientController {

    private final IPatientService patientService;
    private final PatientRepository patientRepository;

    public PatientController(IPatientService patientService, PatientRepository patientRepository) {
        this.patientService = patientService;
        this.patientRepository = patientRepository;
    }

    @GetMapping
    public List<Patient> getAllPatients() {
        return patientService.retrieveAllPatients();
    }

    @GetMapping("/{id}")
    public Patient getPatientById(@PathVariable("id") Long id) {
        return patientService.retrievePatient(id);
    }

    @GetMapping("/by-user/{userId}")
    public ResponseEntity<Patient> getPatientByUserId(@PathVariable("userId") Long userId) {
        return patientRepository.findByUser_Id(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @PostMapping
    public Patient createPatient(@RequestBody Patient patient) {
        return patientService.addPatient(patient);
    }

    @PutMapping("/{id}")
    public Patient updatePatient(@PathVariable("id") Long id, @RequestBody Patient patient) {
        patient.setId(id);
        return patientService.updatePatient(patient);
    }

    @DeleteMapping("/{id}")
    public void deletePatient(@PathVariable("id") Long id) {
        patientService.removePatient(id);
    }

    // ── Assignment endpoints ────────────────────────────────────────────────

    @GetMapping("/by-medecin/{medecinId}")
    public List<Patient> getPatientsByMedecin(@PathVariable Long medecinId) {
        return patientRepository.findByMedecinId(medecinId);
    }

    @GetMapping("/unassigned")
    public List<Patient> getUnassignedPatients() {
        return patientRepository.findByMedecinIdIsNull();
    }

    @GetMapping("/assigned-doctor/{userPatientId}")
    public ResponseEntity<?> getAssignedDoctor(@PathVariable Long userPatientId) {
        Optional<Patient> opt = patientRepository.findByUser_Id(userPatientId);
        if (opt.isEmpty() || opt.get().getMedecinId() == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(java.util.Map.of("medecinId", opt.get().getMedecinId()));
    }

    @PostMapping("/{patientId}/assign/{medecinId}")
    public ResponseEntity<Patient> assignPatient(@PathVariable Long patientId, @PathVariable Long medecinId) {
        Patient p = patientRepository.findById(patientId).orElseThrow();
        p.setMedecinId(medecinId);
        return ResponseEntity.ok(patientRepository.save(p));
    }

    @DeleteMapping("/{patientId}/unassign")
    public ResponseEntity<Void> unassignPatient(@PathVariable Long patientId) {
        patientRepository.findById(patientId).ifPresent(p -> {
            p.setMedecinId(null);
            patientRepository.save(p);
        });
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{patientId}/reassign/{newMedecinId}")
    public ResponseEntity<Patient> reassignPatient(@PathVariable Long patientId, @PathVariable Long newMedecinId) {
        Patient p = patientRepository.findById(patientId).orElseThrow();
        p.setMedecinId(newMedecinId);
        return ResponseEntity.ok(patientRepository.save(p));
    }
}
