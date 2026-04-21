package esprit.tn.patientmedecin.services;

import esprit.tn.patientmedecin.entities.JeuCognitif;
import java.util.List;

public interface IJeuCognitifService {
    List<JeuCognitif> retrieveAllJeux();
    JeuCognitif addJeu(JeuCognitif jeu);
}
