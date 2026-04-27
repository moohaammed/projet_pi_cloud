package esprit.tn.backpi.controllers.gestion_patient;

import esprit.tn.backpi.dto.PatientMetadataDto;
import esprit.tn.backpi.entities.gestion_patient.Patient;
import esprit.tn.backpi.services.gestion_patient.IPatientService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/patients")
@CrossOrigin(originPatterns = "*")
public class PatientController {

    private final IPatientService patientService;

    public PatientController(IPatientService patientService) {
        this.patientService = patientService;
    }

    @GetMapping
    public List<Patient> getAllPatients() {
        return patientService.retrieveAllPatients();
    }

    @GetMapping("/{id}")
    public Patient getPatientById(@PathVariable("id") Long id) {
        return patientService.retrievePatient(id);
    }

    /**
     * GET /api/patients/by-user/{userId}
     *
     * Returns only the patient metadata (age, sexe, poids) for the given userId.
     * Used by the smartwatch-service AI prediction pipeline.
     * Returns 204 No Content if no patient is linked to this user.
     */
    @GetMapping("/by-user/{userId}")
    public ResponseEntity<PatientMetadataDto> getPatientMetadataByUserId(@PathVariable("userId") Long userId) {
        Patient patient = patientService.retrievePatientByUserId(userId);
        if (patient == null) {
            return ResponseEntity.noContent().build();
        }
        PatientMetadataDto dto = PatientMetadataDto.builder()
                .age(patient.getAge())
                .sexe(patient.getSexe())
                .poids(patient.getPoids())
                .build();
        return ResponseEntity.ok(dto);
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
}
