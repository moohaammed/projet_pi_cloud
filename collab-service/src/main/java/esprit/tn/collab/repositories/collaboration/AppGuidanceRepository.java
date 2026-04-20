package esprit.tn.collab.repositories.collaboration;

import esprit.tn.collab.entities.collaboration.AppGuidance;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface AppGuidanceRepository extends MongoRepository<AppGuidance, String> {

    
    Optional<AppGuidance> findByPageName(String pageName);
}
