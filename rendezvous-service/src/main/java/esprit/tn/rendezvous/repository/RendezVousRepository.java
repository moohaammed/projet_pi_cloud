package esprit.tn.rendezvous.repository;

import esprit.tn.rendezvous.entity.RendezVous;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RendezVousRepository extends MongoRepository<RendezVous, String> {
    List<RendezVous> findByPatientId(Long patientId);
    List<RendezVous> findByMedecinId(Long medecinId);
}
