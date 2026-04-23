package esprit.tn.patientmedecin.services;

import esprit.tn.patientmedecin.entities.JeuCognitif;
import esprit.tn.patientmedecin.repositories.JeuCognitifRepository;
import esprit.tn.patientmedecin.sequence.SequenceGeneratorService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class JeuCognitifServiceImpl implements IJeuCognitifService {

    private final JeuCognitifRepository jeuCognitifRepository;
    private final SequenceGeneratorService sequenceGenerator;

    public JeuCognitifServiceImpl(JeuCognitifRepository jeuCognitifRepository, SequenceGeneratorService sequenceGenerator) {
        this.jeuCognitifRepository = jeuCognitifRepository;
        this.sequenceGenerator = sequenceGenerator;
    }

    @Override
    public List<JeuCognitif> retrieveAllJeux() {
        return jeuCognitifRepository.findAll();
    }

    @Override
    public JeuCognitif addJeu(JeuCognitif jeu) {
        if (jeu.getId() == null) {
            jeu.setId(sequenceGenerator.generateSequence(JeuCognitif.SEQUENCE_NAME));
        }
        return jeuCognitifRepository.save(jeu);
    }
}
