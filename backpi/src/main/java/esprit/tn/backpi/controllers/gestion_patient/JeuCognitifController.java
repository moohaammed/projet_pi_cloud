package esprit.tn.backpi.controllers.gestion_patient;

import esprit.tn.backpi.entities.gestion_patient.JeuCognitif;
import esprit.tn.backpi.services.gestion_patient.IJeuCognitifService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/jeux")
@CrossOrigin(originPatterns = "*")
@RequiredArgsConstructor
public class JeuCognitifController {

    private final IJeuCognitifService jeuCognitifService;

    @GetMapping
    public List<JeuCognitif> getAllJeux() {
        return jeuCognitifService.retrieveAllJeux();
    }

    @PostMapping
    public JeuCognitif createJeu(@RequestBody JeuCognitif jeu) {
        return jeuCognitifService.addJeu(jeu);
    }
}
