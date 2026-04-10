package esprit.tn.collab.services.collaboration;

import esprit.tn.collab.clients.UserClient;
import esprit.tn.collab.dto.collaboration.CommentCreateDto;
import esprit.tn.collab.dto.collaboration.CommentResponseDto;
import esprit.tn.collab.entities.collaboration.Comment;
import esprit.tn.collab.repositories.collaboration.PublicationRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class CommentService {

    private final PublicationRepository publicationRepository;
    private final NotificationService notificationService;
    private final UserClient userClient;

    public CommentService(PublicationRepository publicationRepository,
                          NotificationService notificationService,
                          UserClient userClient) {
        this.publicationRepository = publicationRepository;
        this.notificationService = notificationService;
        this.userClient = userClient;
    }

    public List<CommentResponseDto> getCommentsByPublication(String publicationId) {
        return publicationRepository.findById(publicationId)
                .map(pub -> pub.getComments().stream().map(c -> mapToDto(c, publicationId)).collect(Collectors.toList()))
                .orElse(List.of());
    }

    public CommentResponseDto createComment(CommentCreateDto dto) {
        return publicationRepository.findById(dto.getPublicationId()).map(pub -> {
            Comment comment = new Comment();
            comment.setContent(dto.getContent());
            comment.setAuthorId(dto.getAuthorId());
            comment.setCreatedAt(Instant.now());
            pub.getComments().add(comment);
            publicationRepository.save(pub);

            if (!pub.getAuthorId().equals(dto.getAuthorId())) {
                notificationService.createAndSend(pub.getAuthorId(),
                    "User " + dto.getAuthorId() + " commented on your post.", "COMMENT");
            }
            return mapToDto(comment, pub.getId());
        }).orElseThrow(() -> new RuntimeException("Publication not found: " + dto.getPublicationId()));
    }

    public CommentResponseDto updateComment(String commentId, CommentCreateDto dto) {
        return publicationRepository.findById(dto.getPublicationId()).map(pub -> {
            pub.getComments().stream().filter(c -> c.getId().equals(commentId)).findFirst().ifPresent(c -> {
                c.setContent(dto.getContent());
            });
            publicationRepository.save(pub);
            return pub.getComments().stream().filter(c -> c.getId().equals(commentId))
                    .findFirst().map(c -> mapToDto(c, pub.getId())).orElse(null);
        }).orElse(null);
    }

    public void deleteComment(String commentId) {
        // Find the publication containing this comment and remove it
        publicationRepository.findAll().forEach(pub -> {
            boolean removed = pub.getComments().removeIf(c -> c.getId().equals(commentId));
            if (removed) publicationRepository.save(pub);
        });
    }

    private CommentResponseDto mapToDto(Comment comment, String publicationId) {
        CommentResponseDto dto = new CommentResponseDto();
        dto.setId(comment.getId());
        dto.setContent(comment.getContent());
        dto.setCreatedAt(comment.getCreatedAt());
        dto.setAuthorId(comment.getAuthorId());
        dto.setPublicationId(publicationId);
        if (comment.getAuthorId() != null) {
            Map<String, Object> author = userClient.getUserById(comment.getAuthorId());
            dto.setAuthorName(userClient.getFullName(author));
        }
        return dto;
    }
}
