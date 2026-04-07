package esprit.tn.collab.services.collaboration;

import esprit.tn.collab.clients.UserClient;
import esprit.tn.collab.dto.collaboration.CommentCreateDto;
import esprit.tn.collab.dto.collaboration.CommentResponseDto;
import esprit.tn.collab.entities.collaboration.Comment;
import esprit.tn.collab.entities.collaboration.Publication;
import esprit.tn.collab.repositories.collaboration.CommentRepository;
import esprit.tn.collab.repositories.collaboration.PublicationRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final PublicationRepository publicationRepository;
    private final NotificationService notificationService;
    private final UserClient userClient;

    public CommentService(CommentRepository commentRepository,
                          PublicationRepository publicationRepository,
                          NotificationService notificationService,
                          UserClient userClient) {
        this.commentRepository = commentRepository;
        this.publicationRepository = publicationRepository;
        this.notificationService = notificationService;
        this.userClient = userClient;
    }

    public List<CommentResponseDto> getCommentsByPublication(Long publicationId) {
        return commentRepository.findByPublicationIdOrderByCreatedAtAsc(publicationId).stream()
                .map(this::mapToResponseDto).collect(Collectors.toList());
    }

    public CommentResponseDto createComment(CommentCreateDto dto) {
        Publication publication = publicationRepository.findById(dto.getPublicationId())
                .orElseThrow(() -> new RuntimeException("Publication not found: " + dto.getPublicationId()));

        Comment comment = new Comment();
        comment.setContent(dto.getContent());
        comment.setAuthorId(dto.getAuthorId());
        comment.setPublication(publication);
        comment.setCreatedAt(Instant.now());

        Comment saved = commentRepository.save(comment);

        if (!publication.getAuthorId().equals(dto.getAuthorId())) {
            notificationService.createAndSend(publication.getAuthorId(),
                "User " + dto.getAuthorId() + " commented on your post.", "COMMENT");
        }
        return mapToResponseDto(saved);
    }

    public CommentResponseDto updateComment(Long id, CommentCreateDto dto) {
        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Comment not found: " + id));
        comment.setContent(dto.getContent());
        return mapToResponseDto(commentRepository.save(comment));
    }

    public void deleteComment(Long id) {
        commentRepository.deleteById(id);
    }

    private CommentResponseDto mapToResponseDto(Comment comment) {
        CommentResponseDto dto = new CommentResponseDto();
        dto.setId(comment.getId());
        dto.setContent(comment.getContent());
        dto.setCreatedAt(comment.getCreatedAt());
        dto.setAuthorId(comment.getAuthorId());
        Map<String, Object> author = userClient.getUserById(comment.getAuthorId());
        dto.setAuthorName(userClient.getFullName(author));
        if (comment.getPublication() != null) dto.setPublicationId(comment.getPublication().getId());
        return dto;
    }
}
