package esprit.tn.patientmedecin.repositories;

import esprit.tn.patientmedecin.entities.Analyse;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnalyseRepository extends MongoRepository<Analyse, Long> {
    List<Analyse> findByPatient_Id(Long patientId);
}
