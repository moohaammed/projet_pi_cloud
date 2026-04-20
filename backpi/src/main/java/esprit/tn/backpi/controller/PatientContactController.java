package esprit.tn.backpi.controller;

import esprit.tn.backpi.dto.PatientContactDTO;
import esprit.tn.backpi.entity.PatientContact;
import esprit.tn.backpi.service.PatientContactService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/patient-contacts")
@CrossOrigin(origins = "http://localhost:4200")
public class PatientContactController {

    @Autowired
    private PatientContactService patientContactService;

    @GetMapping
    public ResponseEntity<?> getContacts(@RequestParam Long userId) {
        try {
            List<PatientContact> contacts = patientContactService.getContactsForPatient(userId);
            return ResponseEntity.ok(contacts);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createContact(@RequestParam Long userId,
                                           @RequestBody PatientContactDTO dto) {
        try {
            PatientContact contact = patientContactService.createContact(userId, dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(contact);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateContact(@PathVariable Long id,
                                           @RequestParam Long userId,
                                           @RequestBody PatientContactDTO dto) {
        try {
            PatientContact contact = patientContactService.updateContact(userId, id, dto);
            return ResponseEntity.ok(contact);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteContact(@PathVariable Long id,
                                           @RequestParam Long userId) {
        try {
            patientContactService.deleteContact(userId, id);
            return ResponseEntity.ok(Map.of("message", "Contact deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        }
    }
}
