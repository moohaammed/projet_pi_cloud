package esprit.tn.backpi.services.collaboration;

import esprit.tn.backpi.dto.collaboration.CommentResponseDto;
import esprit.tn.backpi.dto.collaboration.PublicationCreateDto;
import esprit.tn.backpi.dto.collaboration.PublicationResponseDto;
import esprit.tn.backpi.entities.User;
import esprit.tn.backpi.entities.collaboration.Comment;
import esprit.tn.backpi.entities.collaboration.Publication;
import esprit.tn.backpi.repositories.UserRepository;
import esprit.tn.backpi.repositories.collaboration.PublicationRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PublicationService {

    private final PublicationRepository publicationRepository;
    private final SentimentAnalysisService sentimentAnalysisService;
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public PublicationService(PublicationRepository publicationRepository,
                              SentimentAnalysisService sentimentAnalysisService,
                              NotificationService notificationService,
                              UserRepository userRepository) {
        this.publicationRepository = publicationRepository;
        this.sentimentAnalysisService = sentimentAnalysisService;
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    public List<PublicationResponseDto> getAllPublications() {
        return publicationRepository.findAll().stream()
                .map(this::mapToResponseDto)
                .collect(Collectors.toList());
    }

    public PublicationResponseDto getPublicationById(Long id) {
        return publicationRepository.findById(id)
                .map(this::mapToResponseDto)
                .orElse(null);
    }

    public PublicationResponseDto createPublication(PublicationCreateDto dto, String mediaUrl, String mimeType) {
        User author = userRepository.findById(dto.getAuthorId())
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + dto.getAuthorId()));

        Publication publication = new Publication();
        publication.setContent(dto.getContent());
        publication.setType(dto.getType());
        publication.setAuthor(author);
        publication.setCreatedAt(Instant.now());
        publication.setMediaUrl(mediaUrl);
        publication.setMimeType(mimeType);
        publication.setAnonymous(dto.isAnonymous());

        Double score = sentimentAnalysisService.calculateSentimentScore(publication.getContent());
        publication.setSentimentScore(score);
        publication.setDistressed(score <= -0.5);
        
        Publication saved = publicationRepository.save(publication);

        if (saved.isDistressed()) {
            notificationService.createAndSend(
                author.getId(),
                "CareBot: I noticed your post might reflect some distress. Remember, you're not alone. \u2764\uFE0F",
                "CAREBOT"
            );
        } else {
            notificationService.createAndSend(
                author.getId(),
                "Your post was published successfully!",
                "POST_PUBLISHED"
            );
        }

        return mapToResponseDto(saved);
    }

    public PublicationResponseDto updatePublication(Long id, PublicationCreateDto dto, String mediaUrl, String mimeType) {
        return publicationRepository.findById(id).map(existing -> {
            existing.setContent(dto.getContent());
            existing.setType(dto.getType());
            existing.setAnonymous(dto.isAnonymous());
            if (mediaUrl != null) {
                existing.setMediaUrl(mediaUrl);
                existing.setMimeType(mimeType);
            }
            return mapToResponseDto(publicationRepository.save(existing));
        }).orElse(null);
    }

    public void deletePublication(Long id) {
        publicationRepository.deleteById(id);
    }

    // Helper Mapping Method
    private PublicationResponseDto mapToResponseDto(Publication publication) {
        PublicationResponseDto dto = new PublicationResponseDto();
        dto.setId(publication.getId());
        dto.setContent(publication.getContent());
        dto.setMediaUrl(publication.getMediaUrl());
        dto.setMimeType(publication.getMimeType());
        dto.setType(publication.getType());
        dto.setCreatedAt(publication.getCreatedAt());
        dto.setDistressed(publication.isDistressed());
        dto.setSentimentScore(publication.getSentimentScore());
        dto.setAnonymous(publication.isAnonymous());

        if (publication.getAuthor() != null) {
            if (publication.isAnonymous()) {
                dto.setAuthorId(null);
                dto.setAuthorName("Anonymous User");
            } else {
                dto.setAuthorId(publication.getAuthor().getId());
                dto.setAuthorName(publication.getAuthor().getName());
            }
        }

        if (publication.getComments() != null) {
            List<CommentResponseDto> commentDtos = publication.getComments().stream()
                    .map(this::mapCommentToDto)
                    .collect(Collectors.toList());
            dto.setComments(commentDtos);
        }

        return dto;
    }

    private CommentResponseDto mapCommentToDto(Comment comment) {
        CommentResponseDto dto = new CommentResponseDto();
        dto.setId(comment.getId());
        dto.setContent(comment.getContent());
        dto.setCreatedAt(comment.getCreatedAt());
        if (comment.getAuthor() != null) {
            dto.setAuthorId(comment.getAuthor().getId());
            dto.setAuthorName(comment.getAuthor().getName());
        }
        if (comment.getPublication() != null) {
            dto.setPublicationId(comment.getPublication().getId());
        }
        return dto;
    }
}
