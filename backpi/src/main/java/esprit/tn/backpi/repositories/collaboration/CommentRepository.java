package esprit.tn.backpi.repositories.collaboration;
import esprit.tn.backpi.entities.collaboration.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByPublicationIdOrderByCreatedAtAsc(Long publicationId);
}