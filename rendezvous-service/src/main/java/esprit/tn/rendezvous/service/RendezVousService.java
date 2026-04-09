package esprit.tn.rendezvous.service;

import esprit.tn.rendezvous.entity.RendezVous;
import esprit.tn.rendezvous.entity.StatutRendezVous;
import esprit.tn.rendezvous.exception.ResourceNotFoundException;
import esprit.tn.rendezvous.repository.RendezVousRepository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class RendezVousService {

    private final RendezVousRepository repository;
    public RendezVousService(RendezVousRepository repository) {
        this.repository = repository;
    }
    
    public RendezVous create(RendezVous rv) {
        rv.prePersist();
        return repository.save(rv);
    }

    public List<RendezVous> findAll() {
        return repository.findAll();
    }

    public RendezVous findById(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Rendez-vous non trouvé avec l'id : " + id));
    }

    public List<RendezVous> findByPatient(Long patientId) {
        return repository.findByPatientId(patientId);
    }

    public List<RendezVous> findByMedecin(Long medecinId) {
        return repository.findByMedecinId(medecinId);
    }

    public RendezVous update(String id, RendezVous rvDetails) {
        RendezVous rv = findById(id);
        rv.setDateHeure(rvDetails.getDateHeure());
        rv.setMotif(rvDetails.getMotif());
        rv.setObservations(rvDetails.getObservations());
        if (rvDetails.getStatut() != null) {
            rv.setStatut(rvDetails.getStatut());
        }
        rv.setPatientId(rvDetails.getPatientId());
        rv.setMedecinId(rvDetails.getMedecinId());
        return repository.save(rv);
    }

    public RendezVous updateStatut(String id, StatutRendezVous statut) {
        RendezVous rv = findById(id);
        rv.setStatut(statut);
        return repository.save(rv);
    }

    public void delete(String id) {
        findById(id); 
        repository.deleteById(id);
    }
}
