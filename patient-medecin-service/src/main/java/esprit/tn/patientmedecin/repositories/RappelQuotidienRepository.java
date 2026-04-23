package esprit.tn.patientmedecin.repositories;

import esprit.tn.patientmedecin.entities.RappelQuotidien;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RappelQuotidienRepository extends MongoRepository<RappelQuotidien, Long> {
    List<RappelQuotidien> findByPatient_Id(Long patientId);
    List<RappelQuotidien> findByActifTrue();
}
