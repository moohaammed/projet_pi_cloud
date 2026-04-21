package esprit.tn.patientmedecin.repositories;

import esprit.tn.patientmedecin.entities.JeuCognitif;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface JeuCognitifRepository extends MongoRepository<JeuCognitif, Long> {
}
