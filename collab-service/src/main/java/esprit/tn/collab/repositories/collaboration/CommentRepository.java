package esprit.tn.collab.repositories.collaboration;

import esprit.tn.collab.entities.collaboration.Comment;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

// Comments are embedded in Publication — this repo is kept for compatibility
// but most comment operations go through PublicationRepository
public interface CommentRepository extends MongoRepository<Comment, String> {
}
