package esprit.tn.patientmedecin.controllers;

import esprit.tn.patientmedecin.entities.JeuCognitif;
import esprit.tn.patientmedecin.services.IJeuCognitifService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/jeux")
@CrossOrigin(originPatterns = "*")
public class JeuCognitifController {

    private final IJeuCognitifService jeuCognitifService;

    public JeuCognitifController(IJeuCognitifService jeuCognitifService) {
        this.jeuCognitifService = jeuCognitifService;
    }

    @GetMapping
    public List<JeuCognitif> getAllJeux() {
        return jeuCognitifService.retrieveAllJeux();
    }

    @PostMapping
    public JeuCognitif createJeu(@RequestBody JeuCognitif jeu) {
        return jeuCognitifService.addJeu(jeu);
    }
}
