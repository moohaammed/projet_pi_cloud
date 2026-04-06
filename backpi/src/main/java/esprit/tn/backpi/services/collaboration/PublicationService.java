package esprit.tn.backpi.services.collaboration;

import esprit.tn.backpi.dto.collaboration.*;
import esprit.tn.backpi.entities.collaboration.Comment;
import esprit.tn.backpi.entities.collaboration.ModerationReason;
import esprit.tn.backpi.entities.collaboration.ModerationStatus;
import esprit.tn.backpi.entities.collaboration.PublicationPollOption;
import esprit.tn.backpi.entities.collaboration.Publication;
import esprit.tn.backpi.entities.collaboration.PublicationType;
import esprit.tn.backpi.repository.UserRepository;
import esprit.tn.backpi.repositories.collaboration.PublicationPollOptionRepository;
import esprit.tn.backpi.entity.User;
import esprit.tn.backpi.entities.collaboration.ChatGroup;
import esprit.tn.backpi.repositories.collaboration.PublicationRepository;
import esprit.tn.backpi.repositories.collaboration.ChatGroupRepository;
import esprit.tn.backpi.repositories.collaboration.MessageRepository;
import esprit.tn.backpi.repositories.education.EventRepository;
import esprit.tn.backpi.entities.education.Event;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class PublicationService {

    private static final Pattern MISINFORMATION_PATTERN = Pattern.compile(
            ".*\\b(miracle cure|100%\\s*cure|stop (your )?medication|ignore (your )?doctor|guaranteed cure)\\b.*",
            Pattern.CASE_INSENSITIVE | Pattern.DOTALL);

    private final PublicationRepository publicationRepository;
    private final PublicationPollOptionRepository pollOptionRepository;
    private final SentimentAnalysisService sentimentAnalysisService;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final ChatGroupRepository chatGroupRepository;
    private final MessageRepository messageRepository;
    private final EventRepository eventRepository;
    private final CareBotService careBotService;

    public PublicationService(PublicationRepository publicationRepository,
                              PublicationPollOptionRepository pollOptionRepository,
                              SentimentAnalysisService sentimentAnalysisService,
                              NotificationService notificationService,
                              UserRepository userRepository,
                              ChatGroupRepository chatGroupRepository,
                              MessageRepository messageRepository,
                              EventRepository eventRepository,
                              @org.springframework.context.annotation.Lazy CareBotService careBotService) {
        this.publicationRepository = publicationRepository;
        this.pollOptionRepository = pollOptionRepository;
        this.sentimentAnalysisService = sentimentAnalysisService;
        this.notificationService = notificationService;
        this.userRepository = userRepository;
        this.chatGroupRepository = chatGroupRepository;
        this.messageRepository = messageRepository;
        this.eventRepository = eventRepository;
        this.careBotService = careBotService;
    }

    public List<PublicationResponseDto> getAllPublicPublications() {
        return publicationRepository.findByChatGroupIsNullOrderByCreatedAtDesc(Instant.now()).stream()
                .map(this::mapToResponseDto)
                .collect(Collectors.toList());
    }

    public List<PublicationResponseDto> getAllPublications() {
        return publicationRepository.findAllByOrderByCreatedAtDesc(Instant.now()).stream()
                .map(this::mapToResponseDto)
                .collect(Collectors.toList());
    }

    public List<PublicationResponseDto> getPersonalizedFeed(Long userId) {
        return publicationRepository.findPersonalizedFeed(userId, Instant.now()).stream()
                .map(this::mapToResponseDto)
                .collect(Collectors.toList());
    }

    public List<PublicationResponseDto> getGroupFeed(Long groupId) {
        return publicationRepository.findByChatGroupIdOrderByCreatedAtDesc(groupId, Instant.now()).stream()
                .map(this::mapToResponseDto)
                .collect(Collectors.toList());
    }

    public PublicationResponseDto getPublicationById(Long id) {
        return publicationRepository.findById(id)
                .map(this::mapToResponseDto)
                .orElse(null);
    }

    public PublicationResponseDto createPublication(PublicationCreateDto dto, String mediaUrl, String mimeType) {
        validatePublicationCreate(dto);

        User author = userRepository.findById(dto.getAuthorId())
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + dto.getAuthorId()));

        Publication publication = new Publication();
        publication.setContent(dto.getContent() != null ? dto.getContent() : "");
        publication.setType(dto.getType());
        publication.setAuthor(author);
        publication.setCreatedAt(Instant.now());
        publication.setMediaUrl(mediaUrl);
        publication.setMimeType(mimeType);
        publication.setAnonymous(dto.isAnonymous());

        if (dto.getGroupId() != null) {
            ChatGroup group = chatGroupRepository.findById(dto.getGroupId())
                .orElseThrow(() -> new RuntimeException("Group not found with ID: " + dto.getGroupId()));
            publication.setChatGroup(group);
        }

        if (dto.getType() == PublicationType.EVENT) {
            eventRepository.findById(dto.getLinkedEventId())
                    .orElseThrow(() -> new RuntimeException("Event not found with ID: " + dto.getLinkedEventId()));
            publication.setLinkedEventId(dto.getLinkedEventId());
        }

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

        // Use content from DTO - if it's empty, use the poll question (VOTE) or keep note (EVENT)
        String finalContent;
        if (dto.getType() == PublicationType.VOTE) {
            finalContent = (dto.getContent() != null && !dto.getContent().trim().isEmpty())
                    ? dto.getContent()
                    : dto.getPollQuestion();
        } else if (dto.getType() == PublicationType.EVENT) {
            finalContent = dto.getContent() != null ? dto.getContent().trim() : "";
        } else {
            finalContent = dto.getContent() != null ? dto.getContent().trim() : "";
        }

        String sentimentSource = finalContent != null ? finalContent : "";
        if (dto.getType() == PublicationType.EVENT && dto.getLinkedEventId() != null) {
            Event ev = eventRepository.findById(dto.getLinkedEventId()).orElse(null);
            if (ev != null && ev.getTitle() != null) {
                sentimentSource = sentimentSource.isEmpty() ? ev.getTitle() : sentimentSource + " " + ev.getTitle();
            }
        }

        Double score = sentimentAnalysisService.calculateSentimentScore(sentimentSource);
        publication.setSentimentScore(score);
        publication.setDistressed(score <= -0.5);
        publication.setContent(finalContent != null ? finalContent : "");
        
        Publication saved = publicationRepository.saveAndFlush(publication);
        
        // Final robustness: Re-fetch to ensure all cascaded/linked items are present
        Publication fresh = publicationRepository.findById(saved.getId()).orElse(saved);

        boolean misinfo = MISINFORMATION_PATTERN.matcher(sentimentSource).matches();
        if (misinfo) {
            fresh.setModerationStatus(ModerationStatus.PENDING_REVIEW);
            fresh.setModerationReason(ModerationReason.MISINFORMATION);
            fresh.setModerationFlaggedAt(Instant.now());
            publicationRepository.save(fresh);
        } else if (fresh.isDistressed()) {
            fresh.setModerationStatus(ModerationStatus.PENDING_REVIEW);
            fresh.setModerationReason(ModerationReason.HIGH_DISTRESS);
            fresh.setModerationFlaggedAt(Instant.now());
            publicationRepository.save(fresh);
        }

        if (fresh.isDistressed()) {
            notificationService.createAndSend(
                author.getId(),
                "CareBot: I noticed your post might reflect some distress. Remember, you're not alone. \u2764\uFE0F",
                "CAREBOT"
            );
            // Also send a private chat message from CareBot for direct interaction
            careBotService.sendReassurance(author);
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

    public PublicationResponseDto toggleSupport(Long pubId, Long userId) {
        return publicationRepository.findById(pubId).map(pub -> {
            String currentIds = pub.getSupportIds();
            List<String> idList = new ArrayList<>();
            if (currentIds != null && !currentIds.trim().isEmpty()) {
                idList = new ArrayList<>(List.of(currentIds.split(",")));
            }
            
            String uidStr = String.valueOf(userId);
            if (idList.contains(uidStr)) {
                idList.remove(uidStr);
            } else {
                idList.add(uidStr);
            }
            
            pub.setSupportIds(String.join(",", idList));
            return mapToResponseDto(publicationRepository.save(pub));
        }).orElse(null);
    }

    public PublicationResponseDto voteInPoll(Long pubId, int optionIndex, Long userId) {
        return publicationRepository.findById(pubId).map(pub -> {
            if (pub.getType() == PublicationType.VOTE && pub.getPollOptions() != null && optionIndex < pub.getPollOptions().size()) {
                esprit.tn.backpi.entities.collaboration.PublicationPollOption option = pub.getPollOptions().get(optionIndex);
                
                for (esprit.tn.backpi.entities.collaboration.PublicationPollOption opt : pub.getPollOptions()) {
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
    public PublicationResponseDto mapToResponseDto(Publication publication) {
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
        dto.setSupportIds(publication.getSupportIds());
        
        String sIds = publication.getSupportIds();
        if (sIds != null && !sIds.isEmpty()) {
            dto.setSupportCount(sIds.split(",").length);
        } else {
            dto.setSupportCount(0);
        }

        if (publication.getChatGroup() != null) {
            dto.setGroupId(publication.getChatGroup().getId());
            dto.setGroupName(publication.getChatGroup().getName());
        }

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
                String fullName = (publication.getAuthor().getPrenom() + " " + publication.getAuthor().getNom()).trim();
                dto.setAuthorName(fullName.isEmpty() ? "User " + publication.getAuthor().getId() : fullName);
            }
        }

        if (publication.getComments() != null) {
            dto.setCommentCount(publication.getComments().size());
            List<CommentResponseDto> commentDtos = publication.getComments().stream()
                    .map(this::mapCommentToDto)
                    .collect(Collectors.toList());
            dto.setComments(commentDtos);
        }

        dto.setShareCount(messageRepository.countBySharedPublicationId(publication.getId()));

        dto.setLinkedEventId(publication.getLinkedEventId());
        if (publication.getType() == PublicationType.EVENT && publication.getLinkedEventId() != null) {
            dto.setLinkedEvent(buildSharedEventPreview(publication.getLinkedEventId()));
        }

        return dto;
    }

    private void validatePublicationCreate(PublicationCreateDto dto) {
        if (dto.getType() == null) {
            throw new RuntimeException("Publication type is required");
        }
        if (dto.getType() == PublicationType.EVENT) {
            if (dto.getLinkedEventId() == null) {
                throw new RuntimeException("linkedEventId is required for EVENT publications");
            }
            return;
        }
        if (dto.getType() == PublicationType.VOTE) {
            return;
        }
        if (dto.getContent() == null || dto.getContent().isBlank()) {
            throw new RuntimeException("Publication content cannot be empty");
        }
    }

    private SharedEventPreviewDto buildSharedEventPreview(Long eventId) {
        return eventRepository.findById(eventId).map(ev -> {
            SharedEventPreviewDto p = new SharedEventPreviewDto();
            p.setId(ev.getId());
            p.setTitle(ev.getTitle());
            if (ev.getStartDateTime() != null) {
                p.setStartDateTime(ev.getStartDateTime().toString());
            }
            p.setLocation(ev.getLocation());
            p.setDescription(ev.getDescription());
            p.setImageUrl(ev.getImageUrl());
            return p;
        }).orElse(null);
    }

    private CommentResponseDto mapCommentToDto(Comment comment) {
        CommentResponseDto dto = new CommentResponseDto();
        dto.setId(comment.getId());
        dto.setContent(comment.getContent());
        dto.setCreatedAt(comment.getCreatedAt());
        if (comment.getAuthor() != null) {
            dto.setAuthorId(comment.getAuthor().getId());
            String fullName = (comment.getAuthor().getPrenom() + " " + comment.getAuthor().getNom()).trim();
            dto.setAuthorName(fullName.isEmpty() ? "User " + comment.getAuthor().getId() : fullName);
        }
        if (comment.getPublication() != null) {
            dto.setPublicationId(comment.getPublication().getId());
        }
        return dto;
    }
}
