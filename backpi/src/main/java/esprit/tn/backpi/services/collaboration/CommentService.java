package esprit.tn.backpi.services.collaboration;

import esprit.tn.backpi.dto.collaboration.CommentCreateDto;
import esprit.tn.backpi.dto.collaboration.CommentResponseDto;
import esprit.tn.backpi.entities.collaboration.Comment;
import esprit.tn.backpi.entities.collaboration.Publication;
import esprit.tn.backpi.entity.User;
import esprit.tn.backpi.repositories.collaboration.CommentRepository;
import esprit.tn.backpi.repositories.collaboration.PublicationRepository;
import esprit.tn.backpi.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final PublicationRepository publicationRepository;
    private final NotificationService notificationService;

    public CommentService(CommentRepository commentRepository,
                          UserRepository userRepository,
                          PublicationRepository publicationRepository,
                          NotificationService notificationService) {
        this.commentRepository = commentRepository;
        this.userRepository = userRepository;
        this.publicationRepository = publicationRepository;
        this.notificationService = notificationService;
    }

    public List<CommentResponseDto> getCommentsByPublication(Long publicationId) {
        List<Comment> comments = commentRepository.findByPublicationIdOrderByCreatedAtAsc(publicationId);
        return comments.stream()
                .map(this::mapToResponseDto)
                .collect(Collectors.toList());
    }

    public CommentResponseDto createComment(CommentCreateDto dto) {
        // 1. Fetch related entities
        User author = userRepository.findById(dto.getAuthorId())
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + dto.getAuthorId()));
        Publication publication = publicationRepository.findById(dto.getPublicationId())
                .orElseThrow(() -> new RuntimeException("Publication not found with ID: " + dto.getPublicationId()));

        // 2. Map DTO -> Entity
        Comment comment = new Comment();
        comment.setContent(dto.getContent());
        comment.setAuthor(author);
        comment.setPublication(publication);
        comment.setCreatedAt(Instant.now());

        // 3. Save to DB
        Comment saved = commentRepository.save(comment);

        // 4. Trigger Business Logic (Notifications)
        Long authorOfPostId = publication.getAuthor().getId();
        if (!authorOfPostId.equals(author.getId())) {
            notificationService.createAndSend(
                authorOfPostId,
                "User " + author.getId() + " commented on your post.",
                "COMMENT"
            );
        }

        // 5. Map Entity -> ResponseDto
        return mapToResponseDto(saved);
    }

    public CommentResponseDto updateComment(Long id, CommentCreateDto dto) {
        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Comment not found with ID: " + id));
        comment.setContent(dto.getContent());
        Comment saved = commentRepository.save(comment);
        return mapToResponseDto(saved);
    }

    public void deleteComment(Long id) {
        commentRepository.deleteById(id);
    }

    // Helper Mapping Method
    private CommentResponseDto mapToResponseDto(Comment comment) {
        CommentResponseDto dto = new CommentResponseDto();
        dto.setId(comment.getId());
        dto.setContent(comment.getContent());
        dto.setCreatedAt(comment.getCreatedAt());
        
        if (comment.getAuthor() != null) {
            dto.setAuthorId(comment.getAuthor().getId());
            dto.setAuthorName(comment.getAuthor().getNom());
        }
        
        if (comment.getPublication() != null) {
            dto.setPublicationId(comment.getPublication().getId());
        }
        
        return dto;
    }
}
