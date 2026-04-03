package esprit.tn.backpi.services.gestion_patient;

import esprit.tn.backpi.entities.gestion_patient.JeuCognitif;
import java.util.List;

public interface IJeuCognitifService {
    List<JeuCognitif> retrieveAllJeux();

    JeuCognitif addJeu(JeuCognitif j);

    JeuCognitif updateJeu(JeuCognitif j);

    JeuCognitif retrieveJeu(Long id);

    void removeJeu(Long id);
}
