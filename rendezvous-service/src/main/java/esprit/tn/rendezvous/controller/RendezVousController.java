package esprit.tn.rendezvous.controller;

import esprit.tn.rendezvous.entity.RendezVous;
import esprit.tn.rendezvous.entity.StatutRendezVous;
import esprit.tn.rendezvous.service.RendezVousService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/rendezvous")
@CrossOrigin(origins = "http://localhost:4200")
public class RendezVousController {

    private final RendezVousService service;

    public RendezVousController(RendezVousService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<RendezVous> create(@RequestBody RendezVous rv) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(rv));
    }

    @GetMapping
    public ResponseEntity<List<RendezVous>> getAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RendezVous> getById(@PathVariable String id) {
        try {
            Long longId = Long.parseLong(id);
            // Handle possibility of legacy ID being sent just in case
            // But we actually use string IDs now, so this is just if needed.
        } catch (NumberFormatException ignored) {}
        
        return ResponseEntity.ok(service.findById(id));
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<RendezVous>> getByPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(service.findByPatient(patientId));
    }

    @GetMapping("/medecin/{medecinId}")
    public ResponseEntity<List<RendezVous>> getByMedecin(@PathVariable Long medecinId) {
        return ResponseEntity.ok(service.findByMedecin(medecinId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RendezVous> update(@PathVariable String id, @RequestBody RendezVous rv) {
        return ResponseEntity.ok(service.update(id, rv));
    }

    @PatchMapping("/{id}/statut")
    public ResponseEntity<RendezVous> updateStatut(@PathVariable String id, @RequestParam StatutRendezVous statut) {
        return ResponseEntity.ok(service.updateStatut(id, statut));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
