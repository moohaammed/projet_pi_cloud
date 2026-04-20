package esprit.tn.backpi.repositories.gestion_patient;

import esprit.tn.backpi.entities.gestion_patient.RappelQuotidien;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RappelQuotidienRepository extends JpaRepository<RappelQuotidien, Long> {
    List<RappelQuotidien> findByPatientId(Long patientId);
    List<RappelQuotidien> findByActifTrue();
}
