package esprit.tn.backpi.repositories.gestion_patient;

import esprit.tn.backpi.entities.gestion_patient.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PatientRepository extends JpaRepository<Patient, Long> {

    /**
     * Find the patient linked to a given user ID.
     * Used by the AI prediction pipeline to retrieve age/sexe/poids metadata.
     */
    Optional<Patient> findByUser_Id(Long userId);

}
