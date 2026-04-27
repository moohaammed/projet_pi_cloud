package esprit.tn.backpi.controllers;

import esprit.tn.backpi.dto.PatientCreationRequest;
import esprit.tn.backpi.dto.PatientCreationResponse;
import esprit.tn.backpi.services.PatientCreationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class PatientCreationController {

    private final PatientCreationService patientCreationService;

    /**
     * POST /api/users/creer-avec-relation
     * Crée un nouveau patient + un compte RELATION
     */
    @PostMapping("/creer-avec-relation")
    public ResponseEntity<PatientCreationResponse> creerPatientEtRelation(
            @RequestBody PatientCreationRequest req) {

        PatientCreationResponse response =
                patientCreationService.creerPatientEtRelation(req, null);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/users/ajouter-relation
     * Ajoute un compte RELATION à un patient EXISTANT (sans recréer le patient)
     */
    @PostMapping("/ajouter-relation")
    public ResponseEntity<PatientCreationResponse> ajouterRelation(
            @RequestBody PatientCreationRequest req) {

        PatientCreationResponse response =
                patientCreationService.ajouterRelationExistant(req);
        return ResponseEntity.ok(response);
    }
}