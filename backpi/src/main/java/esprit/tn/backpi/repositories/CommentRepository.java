package esprit.tn.backpi.repositories;

import esprit.tn.backpi.entities.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByPublicationIdOrderByCreatedAtAsc(Long publicationId);
}
