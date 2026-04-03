package esprit.tn.backpi.service;
import esprit.tn.backpi.entity.RendezVous;
import esprit.tn.backpi.entity.StatutRendezVous;
import esprit.tn.backpi.exception.ResourceNotFoundException;
import esprit.tn.backpi.repository.RendezVousRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class RendezVousService {

    private final RendezVousRepository repository;
    public RendezVousService(RendezVousRepository repository) {
        this.repository = repository;
    }
    // Créer un RDV
    public RendezVous create(RendezVous rv) {
        return repository.save(rv);
    }

    // Tous les RDV
    public List<RendezVous> findAll() {
        return repository.findAll();
    }

    // RDV par ID
    public RendezVous findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Rendez-vous non trouvé avec l'id : " + id));
    }

    // RDV par Patient
    public List<RendezVous> findByPatient(Long patientId) {
        return repository.findByPatientId(patientId);
    }

    // RDV par Médecin
    public List<RendezVous> findByMedecin(Long medecinId) {
        return repository.findByMedecinId(medecinId);
    }

    // Modifier un RDV
    public RendezVous update(Long id, RendezVous rvDetails) {
        RendezVous rv = findById(id);
        rv.setDateHeure(rvDetails.getDateHeure());
        rv.setMotif(rvDetails.getMotif());
        rv.setObservations(rvDetails.getObservations());
        rv.setStatut(rvDetails.getStatut());
        rv.setPatientId(rvDetails.getPatientId());
        rv.setMedecinId(rvDetails.getMedecinId());
        return repository.save(rv);
    }

    // Changer uniquement le statut
    public RendezVous updateStatut(Long id, StatutRendezVous statut) {
        RendezVous rv = findById(id);
        rv.setStatut(statut);
        return repository.save(rv);
    }

    // Supprimer
    public void delete(Long id) {
        findById(id); // vérifie que ça existe
        repository.deleteById(id);
    }
}