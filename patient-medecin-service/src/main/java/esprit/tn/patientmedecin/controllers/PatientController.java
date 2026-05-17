package esprit.tn.patientmedecin.controllers;

import esprit.tn.patientmedecin.entities.Patient;
import esprit.tn.patientmedecin.entities.UserInfo;
import esprit.tn.patientmedecin.repositories.PatientRepository;
import esprit.tn.patientmedecin.services.IPatientService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
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
        Patient p = patientService.retrievePatientByUserId(userId);
        return p != null ? ResponseEntity.ok(p) : ResponseEntity.noContent().build();
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

    /**
     * PATCH /api/patients/{id}/patch-email
     * Updates the email (and optionally telephone) stored inside the patient's
     * embedded UserInfo. This is used to sync emails from the main backend.
     * Body: { "email": "patient@example.com", "telephone": "..." }
     */
    @PatchMapping("/{id}/patch-email")
    public ResponseEntity<Patient> patchEmail(
            @PathVariable("id") Long id,
            @RequestBody Map<String, String> body) {

        Patient p = patientRepository.findById(id).orElse(null);
        if (p == null) return ResponseEntity.notFound().build();

        UserInfo user = p.getUser();
        if (user == null) {
            user = new UserInfo();
        }
        if (body.containsKey("email")) {
            user.setEmail(body.get("email"));
        }
        if (body.containsKey("telephone")) {
            user.setTelephone(body.get("telephone"));
        }
        p.setUser(user);
        return ResponseEntity.ok(patientRepository.save(p));
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
        Patient p = patientService.retrievePatientByUserId(userPatientId);
        if (p == null || p.getMedecinId() == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(Map.of("medecinId", p.getMedecinId()));
    }

    @PostMapping("/{patientId}/assign/{medecinId}")
    public ResponseEntity<Patient> assignPatient(@PathVariable Long patientId, @PathVariable Long medecinId) {
        // Try to find by ID first
        Optional<Patient> opt = patientRepository.findById(patientId);
        
        // If not found, try to find by User ID (since patientId passed from frontend might be User ID)
        if (opt.isEmpty()) {
            opt = patientRepository.findByUser_Id(patientId);
        }

        Patient p;
        if (opt.isPresent()) {
            p = opt.get();
        } else {
            // Create a new Patient entity if it doesn't exist
            p = new Patient();
            p.setMedecinId(medecinId);
            // We assume the incoming patientId is the User ID
            UserInfo ui = new UserInfo();
            ui.setId(patientId);
            p.setUser(ui);
            // Assign a temporary ID if sequence is needed, or just let MongoDB handle it if it's not the PK
            // But here the @Id is Long, so we should probably use the sequence or the User ID
            p.setId(patientId); 
        }
        
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
