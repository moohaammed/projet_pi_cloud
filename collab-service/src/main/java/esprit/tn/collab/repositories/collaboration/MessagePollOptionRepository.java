package esprit.tn.collab.repositories.collaboration;

import esprit.tn.collab.entities.collaboration.MessagePollOption;
import org.springframework.data.mongodb.repository.MongoRepository;

// Poll options are embedded in Message — this repo is a no-op stub kept for compatibility
public interface MessagePollOptionRepository extends MongoRepository<MessagePollOption, String> {}
