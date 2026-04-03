package esprit.tn.backpi.repositories.gestion_patient;

import esprit.tn.backpi.entities.gestion_patient.Analyse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AnalyseRepository extends JpaRepository<Analyse, Long> {
    List<Analyse> findByPatientId(Long patientId);
}
