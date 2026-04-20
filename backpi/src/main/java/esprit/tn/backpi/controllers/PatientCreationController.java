package esprit.tn.backpi.controllers;

import esprit.tn.backpi.dto.PatientCreationRequest;
import esprit.tn.backpi.dto.PatientCreationResponse;
import esprit.tn.backpi.services.PatientCreationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class PatientCreationController {

    private final PatientCreationService patientCreationService;

    /**
     * POST /api/patients/creer-avec-relation
     * Crée un compte PATIENT + un compte RELATION en une seule requête.
     */
    @PostMapping("/creer-avec-relation")
    public ResponseEntity<PatientCreationResponse> creerPatientEtRelation(
            @RequestBody PatientCreationRequest req) {

        // Récupère l'id du médecin connecté depuis le SecurityContext
        // (évite @RequestAttribute qui peut planter)
        Long doctorId = getCurrentUserId();

        PatientCreationResponse response =
                patientCreationService.creerPatientEtRelation(req, doctorId);

        return ResponseEntity.ok(response);
    }

    private Long getCurrentUserId() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof org.springframework.security.core.userdetails.UserDetails ud) {
                // Adapter selon votre UserDetails — souvent l'email ou l'id
                return null; // remplacez par votre logique si nécessaire
            }
        } catch (Exception ignored) {}
        return null;
    }
}