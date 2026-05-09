package esprit.tn.patientmedecin.repositories;

import esprit.tn.patientmedecin.entities.Patient;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PatientRepository extends MongoRepository<Patient, Long> {
    @Query("{ 'user._id': ?0 }")
    List<Patient> findByUser_Id(Long userId);
    
    List<Patient> findByMedecinId(Long medecinId);
    List<Patient> findByMedecinIdIsNull();
}
