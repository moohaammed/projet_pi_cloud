package esprit.tn.backpi.services.gestion_patient;

import esprit.tn.backpi.entities.gestion_patient.JeuCognitif;
import esprit.tn.backpi.repositories.gestion_patient.JeuCognitifRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class JeuCognitifServiceImpl implements IJeuCognitifService {

    private final JeuCognitifRepository jeuCognitifRepository;

    @Override
    public List<JeuCognitif> retrieveAllJeux() {
        return jeuCognitifRepository.findAll();
    }

    @Override
    public JeuCognitif addJeu(JeuCognitif j) {
        return jeuCognitifRepository.save(j);
    }

    @Override
    public JeuCognitif updateJeu(JeuCognitif j) {
        return jeuCognitifRepository.save(j);
    }

    @Override
    public JeuCognitif retrieveJeu(Long id) {
        return jeuCognitifRepository.findById(id).orElse(null);
    }

    @Override
    public void removeJeu(Long id) {
        jeuCognitifRepository.deleteById(id);
    }
}
