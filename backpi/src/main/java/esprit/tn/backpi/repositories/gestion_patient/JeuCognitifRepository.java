package esprit.tn.backpi.repositories.gestion_patient;

import esprit.tn.backpi.entities.gestion_patient.JeuCognitif;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface JeuCognitifRepository extends JpaRepository<JeuCognitif, Long> {
}
