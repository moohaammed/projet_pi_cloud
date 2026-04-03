package esprit.tn.backpi.services.collaboration;

import esprit.tn.backpi.dto.collaboration.*;
import esprit.tn.backpi.entities.User;
import esprit.tn.backpi.entities.collaboration.Comment;
import esprit.tn.backpi.entities.collaboration.PublicationPollOption;
import esprit.tn.backpi.entities.collaboration.Publication;
import esprit.tn.backpi.entities.collaboration.PublicationType;
import esprit.tn.backpi.repositories.UserRepository;
import esprit.tn.backpi.repositories.collaboration.PublicationPollOptionRepository;
import esprit.tn.backpi.repositories.collaboration.PublicationRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PublicationService {

    private final PublicationRepository publicationRepository;
    private final PublicationPollOptionRepository pollOptionRepository;
    private final SentimentAnalysisService sentimentAnalysisService;
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public PublicationService(PublicationRepository publicationRepository,
                              PublicationPollOptionRepository pollOptionRepository,
                              SentimentAnalysisService sentimentAnalysisService,
                              NotificationService notificationService,
                              UserRepository userRepository) {
        this.publicationRepository = publicationRepository;
        this.pollOptionRepository = pollOptionRepository;
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
        publication.setType(dto.getType()); // Explicitly set it from DTO

        // Robust Poll Mapping
        if (dto.getType() == PublicationType.VOTE) {
            System.out.println("Processing VOTE publication. Question: " + dto.getPollQuestion());
            if (dto.getPollQuestion() != null) {
                publication.setPollQuestion(dto.getPollQuestion());
                if (dto.getPollOptions() != null && !dto.getPollOptions().isEmpty()) {
                    List<PublicationPollOption> options = new ArrayList<>();
                    for (String optionText : dto.getPollOptions()) {
                        if (optionText != null && !optionText.trim().isEmpty()) {
                            PublicationPollOption option = new PublicationPollOption();
                            option.setText(optionText.trim());
                            option.setPublication(publication);
                            options.add(option);
                        }
                    }
                    publication.setPollOptions(options);
                    System.out.println("Mapped " + options.size() + " poll options.");
                } else {
                    System.out.println("Warning: VOTE publication created without options.");
                }
            } else {
                System.out.println("Warning: VOTE publication created without a question.");
            }
        }

        // Use content from DTO - if it's empty, use the poll question
        String finalContent = (dto.getContent() != null && !dto.getContent().trim().isEmpty()) 
            ? dto.getContent() 
            : dto.getPollQuestion();
        
        Double score = sentimentAnalysisService.calculateSentimentScore(finalContent);
        publication.setSentimentScore(score);
        publication.setDistressed(score <= -0.5);
        publication.setContent(finalContent);
        
        Publication saved = publicationRepository.saveAndFlush(publication);
        
        // Final robustness: Re-fetch to ensure all cascaded/linked items are present
        Publication fresh = publicationRepository.findById(saved.getId()).orElse(saved);

        if (fresh.isDistressed()) {
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

    public PublicationResponseDto voteInPoll(Long pubId, int optionIndex, Long userId) {
        return publicationRepository.findById(pubId).map(pub -> {
            if (pub.getType() == PublicationType.VOTE && pub.getPollOptions() != null && optionIndex < pub.getPollOptions().size()) {
                PublicationPollOption option = pub.getPollOptions().get(optionIndex);
                
                // Toggle vote: if user already voted for this option, remove it; otherwise add it.
                // Alternatively, if user can only vote for one option, remove from others first.
                // Let's implement single vote logic:
                for (PublicationPollOption opt : pub.getPollOptions()) {
                    if (opt.getVoterIds().contains(userId)) {
                        opt.getVoterIds().remove(userId);
                        opt.setVotes(opt.getVoterIds().size());
                    }
                }
                
                option.getVoterIds().add(userId);
                option.setVotes(option.getVoterIds().size());
                
                return mapToResponseDto(publicationRepository.save(pub));
            }
            return mapToResponseDto(pub);
        }).orElse(null);
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
        dto.setPollQuestion(publication.getPollQuestion());

        if (publication.getPollOptions() != null) {
            dto.setPollOptions(publication.getPollOptions().stream()
                    .map(opt -> {
                        PollOptionResponseDto optDto = new PollOptionResponseDto();
                        optDto.setId(opt.getId());
                        optDto.setText(opt.getText());
                        optDto.setVotes(opt.getVotes());
                        optDto.setVoterIds(opt.getVoterIds());
                        return optDto;
                    })
                    .collect(Collectors.toList()));
        }

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
