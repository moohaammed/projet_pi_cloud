package esprit.tn.geo.repositories.geo;

import esprit.tn.geo.entities.geo.Hospital;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface HospitalRepository extends MongoRepository<Hospital, String> {
}