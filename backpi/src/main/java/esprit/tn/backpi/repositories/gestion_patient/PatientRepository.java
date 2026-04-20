package esprit.tn.backpi.repositories.gestion_patient;

import esprit.tn.backpi.entities.gestion_patient.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PatientRepository extends JpaRepository<Patient, Long> {
    Optional<Patient> findByUser_Id(Long userId);
    List<Patient> findByMedecinId(Long medecinId);
    List<Patient> findByMedecinIdIsNull();
}
