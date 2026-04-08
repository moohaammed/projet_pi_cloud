package esprit.tn.collab.repositories.collaboration;

import esprit.tn.collab.entities.collaboration.PublicationPollOption;
import org.springframework.data.mongodb.repository.MongoRepository;

// Poll options are embedded in Publication — stub kept for compatibility
public interface PublicationPollOptionRepository extends MongoRepository<PublicationPollOption, String> {}
