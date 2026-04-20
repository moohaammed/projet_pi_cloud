package esprit.tn.geo.controllers.geo;

import esprit.tn.geo.dto.IncidentRequest;
import esprit.tn.geo.entities.geo.Incident;
import esprit.tn.geo.services.geo.IncidentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/incidents")
@CrossOrigin(origins = "*")
public class IncidentController {

    @Autowired
    private IncidentService incidentService;

    /**
     * POST /api/incidents          ← AJOUT : appelé par Angular doctor-map
     * Même logique que /ai, sans passer par l'alias.
     */
    @PostMapping
    public ResponseEntity<?> create(@RequestBody IncidentRequest request) {
        try {
            Incident saved = incidentService.creerIncident(request);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("Erreur lors de la création de l'incident: " + e.getMessage());
        }
    }

    /**
     * POST /api/incidents/ai       ← inchangé
     */
    @PostMapping("/ai")
    public ResponseEntity<?> createFromAi(@RequestBody IncidentRequest request) {
        try {
            Incident saved = incidentService.creerIncident(request);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("Erreur lors de la création de l'incident: " + e.getMessage());
        }
    }

    /**
     * GET /api/incidents           ← inchangé
     */
    @GetMapping
    public ResponseEntity<List<Incident>> getAll() {
        return ResponseEntity.ok(incidentService.getAll());
    }

    /**
     * GET /api/incidents/patient/{id}  ← inchangé
     */
    @GetMapping("/patient/{id}")
    public ResponseEntity<List<Incident>> getByPatient(@PathVariable Long id) {
        return ResponseEntity.ok(incidentService.getByPatient(id));
    }

    /**
     * PATCH /api/incidents/{id}/resoudre  ← inchangé
     */
    @PatchMapping("/{id}/resoudre")
    public ResponseEntity<?> resoudre(@PathVariable String id) {
        try {
            return ResponseEntity.ok(incidentService.resoudre(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * PATCH /api/incidents/{id}/fermer  ← inchangé
     */
    @PatchMapping("/{id}/fermer")
    public ResponseEntity<?> fermer(@PathVariable String id) {
        try {
            return ResponseEntity.ok(incidentService.fermer(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}