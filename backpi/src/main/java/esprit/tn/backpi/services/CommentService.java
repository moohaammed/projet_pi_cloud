package esprit.tn.backpi.services;

import esprit.tn.backpi.entities.Comment;
import esprit.tn.backpi.repositories.CommentRepository;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.List;

@Service
public class CommentService {

    private final CommentRepository commentRepository;

    public CommentService(CommentRepository commentRepository) {
        this.commentRepository = commentRepository;
    }

    public List<Comment> getCommentsByPublication(Long publicationId) {
        return commentRepository.findByPublicationIdOrderByCreatedAtAsc(publicationId);
    }

    public Comment createComment(Comment comment) {
        if (comment.getCreatedAt() == null) {
            comment.setCreatedAt(Instant.now());
        }
        return commentRepository.save(comment);
    }

    public void deleteComment(Long id) {
        commentRepository.deleteById(id);
    }
}
