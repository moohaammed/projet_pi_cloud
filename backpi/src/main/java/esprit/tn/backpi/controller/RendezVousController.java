package esprit.tn.backpi.controller;
import esprit.tn.backpi.entity.RendezVous;
import esprit.tn.backpi.entity.StatutRendezVous;
import esprit.tn.backpi.service.RendezVousService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/rendezvous")
@CrossOrigin("*")
public class RendezVousController {

    private final RendezVousService service;

    // Ajoute ce constructeur manuellement :
    public RendezVousController(RendezVousService service) {
        this.service = service;
    }

    // CREATE
    @PostMapping
    public ResponseEntity<RendezVous> create(@RequestBody RendezVous rv) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(rv));
    }

    // READ ALL
    @GetMapping
    public ResponseEntity<List<RendezVous>> getAll() {
        return ResponseEntity.ok(service.findAll());
    }

    // READ BY ID
    @GetMapping("/{id}")
    public ResponseEntity<RendezVous> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    // READ BY PATIENT
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<RendezVous>> getByPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(service.findByPatient(patientId));
    }

    // READ BY MEDECIN
    @GetMapping("/medecin/{medecinId}")
    public ResponseEntity<List<RendezVous>> getByMedecin(@PathVariable Long medecinId) {
        return ResponseEntity.ok(service.findByMedecin(medecinId));
    }

    // UPDATE
    @PutMapping("/{id}")
    public ResponseEntity<RendezVous> update(@PathVariable Long id,
                                             @RequestBody RendezVous rv) {
        return ResponseEntity.ok(service.update(id, rv));
    }

    // UPDATE STATUT SEULEMENT
    @PatchMapping("/{id}/statut")
    public ResponseEntity<RendezVous> updateStatut(@PathVariable Long id,
                                                   @RequestParam StatutRendezVous statut) {
        return ResponseEntity.ok(service.updateStatut(id, statut));
    }

    // DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}