package esprit.tn.collab.services.collaboration;

import esprit.tn.collab.clients.UserClient;
import esprit.tn.collab.dto.collaboration.*;
import esprit.tn.collab.entities.collaboration.*;
import esprit.tn.collab.repositories.collaboration.ChatGroupRepository;
import esprit.tn.collab.repositories.collaboration.MessageRepository;
import esprit.tn.collab.repositories.collaboration.PublicationRepository;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Value;

import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class PublicationService {

    private static final Pattern MISINFORMATION_PATTERN = Pattern.compile(
            ".*\\b(miracle cure|100%\\s*cure|stop (your )?medication|ignore (your )?doctor|guaranteed cure)\\b.*",
            Pattern.CASE_INSENSITIVE | Pattern.DOTALL);

    private final PublicationRepository publicationRepository;
    private final SentimentAnalysisService sentimentAnalysisService;
    private final NotificationService notificationService;
    private final UserClient userClient;
    private final ChatGroupRepository chatGroupRepository;
    private final MessageRepository messageRepository;
    private final CareBotService careBotService;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${main.service.url:http://localhost:8086}")
    private String mainServiceUrl;

    public PublicationService(PublicationRepository publicationRepository,
                              SentimentAnalysisService sentimentAnalysisService,
                              NotificationService notificationService,
                              UserClient userClient,
                              ChatGroupRepository chatGroupRepository,
                              MessageRepository messageRepository,
                              @Lazy CareBotService careBotService) {
        this.publicationRepository = publicationRepository;
        this.sentimentAnalysisService = sentimentAnalysisService;
        this.notificationService = notificationService;
        this.userClient = userClient;
        this.chatGroupRepository = chatGroupRepository;
        this.messageRepository = messageRepository;
        this.careBotService = careBotService;
    }

    public List<PublicationResponseDto> getAllPublications() {
        return publicationRepository.findByCreatedAtBeforeOrderByCreatedAtDesc(Instant.now()).stream()
                .map(this::mapToResponseDto).collect(Collectors.toList());
    }

    public List<PublicationResponseDto> getPersonalizedFeed(Long userId) {
        // Get all group IDs the user is a member of
        Set<String> userGroupIds = chatGroupRepository.findAll().stream()
                .filter(g -> g.getMemberIds().contains(userId))
                .map(g -> g.getId())
                .collect(Collectors.toSet());

        return publicationRepository.findAll().stream()
                .filter(p -> {
                    // Include global posts (no group)
                    if (p.getChatGroupId() == null || p.getChatGroupId().isEmpty()) return true;
                    // Include group posts only if user is a member
                    return userGroupIds.contains(p.getChatGroupId());
                })
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(this::mapToResponseDto)
                .collect(Collectors.toList());
    }

    public List<PublicationResponseDto> getGroupFeed(String groupId) {
        return publicationRepository.findByChatGroupIdAndCreatedAtBeforeOrderByCreatedAtDesc(groupId, Instant.now())
                .stream().map(this::mapToResponseDto).collect(Collectors.toList());
    }

    public PublicationResponseDto getPublicationById(String id) {
        return publicationRepository.findById(id).map(this::mapToResponseDto).orElse(null);
    }

    public PublicationResponseDto createPublication(PublicationCreateDto dto, List<String> mediaUrls, List<String> mimeTypes) {
        Publication publication = new Publication();
        publication.setContent(dto.getContent() != null ? dto.getContent() : "");
        publication.setType(dto.getType());
        publication.setAuthorId(dto.getAuthorId());
        publication.setCreatedAt(Instant.now());
        
        if (mediaUrls != null && !mediaUrls.isEmpty()) {
            publication.setMediaUrls(mediaUrls);
            publication.setMimeTypes(mimeTypes);
        }
        
        publication.setAnonymous(dto.isAnonymous());
        if (dto.getTags() != null) publication.setTags(dto.getTags());

        if (dto.getGroupId() != null) {
            chatGroupRepository.findById(dto.getGroupId()).ifPresent(publication::setChatGroup);
        }

        if (dto.getType() == PublicationType.EVENT && dto.getLinkedEventId() != null) {
            publication.setLinkedEventId(dto.getLinkedEventId());
        }

        if (dto.getType() == PublicationType.VOTE && dto.getPollQuestion() != null) {
            publication.setPollQuestion(dto.getPollQuestion());
            if (dto.getPollOptions() != null) {
                List<PublicationPollOption> options = new ArrayList<>();
                for (String optionText : dto.getPollOptions()) {
                    if (optionText != null && !optionText.trim().isEmpty()) {
                        PublicationPollOption option = new PublicationPollOption();
                        option.setText(optionText.trim());
                        options.add(option);
                    }
                }
                publication.setPollOptions(options);
            }
        }

        Double score = sentimentAnalysisService.calculateSentimentScore(publication.getContent());
        publication.setSentimentScore(score);
        publication.setDistressed(score <= SentimentAnalysisService.DISTRESS_THRESHOLD);

        boolean misinfo = MISINFORMATION_PATTERN.matcher(publication.getContent()).matches();
        if (misinfo) {
            publication.setModerationStatus(ModerationStatus.PENDING_REVIEW);
            publication.setModerationReason(ModerationReason.MISINFORMATION);
            publication.setModerationFlaggedAt(Instant.now());
        } else if (publication.isDistressed()) {
            publication.setModerationStatus(ModerationStatus.PENDING_REVIEW);
            publication.setModerationReason(ModerationReason.HIGH_DISTRESS);
            publication.setModerationFlaggedAt(Instant.now());
        }

        Publication saved = publicationRepository.save(publication);

        if (saved.isDistressed()) {
            notificationService.createAndSend(dto.getAuthorId(),
                "CareBot: I noticed your post might reflect some distress. Remember, you're not alone. ❤️", "CAREBOT");
            careBotService.sendReassurance(dto.getAuthorId());

            // Alert all DOCTOR and CAREGIVER users about the distressed post
            String authorName = userClient.getFullName(userClient.getUserById(dto.getAuthorId()));
            String alertMsg = "⚠️ " + authorName + " posted something that may indicate distress. Please check in with them.";
            userClient.getAllUsers().stream()
                .filter(u -> userClient.isRole(u, "DOCTOR") || userClient.isRole(u, "CAREGIVER"))
                .filter(u -> ((Number) u.get("id")).longValue() != dto.getAuthorId())
                .forEach(u -> notificationService.createAndSend(
                    ((Number) u.get("id")).longValue(), alertMsg, "PATIENT_DISTRESS_POST"));
        } else {
            notificationService.createAndSend(dto.getAuthorId(), "Your post was published successfully!", "POST_PUBLISHED");
        }

        return mapToResponseDto(saved);
    }

    public PublicationResponseDto updatePublication(String id, PublicationCreateDto dto, List<String> mediaUrls, List<String> mimeTypes) {
        return publicationRepository.findById(id).map(existing -> {
            existing.setContent(dto.getContent());
            existing.setType(dto.getType());
            existing.setAnonymous(dto.isAnonymous());
            if (dto.getTags() != null) existing.setTags(dto.getTags());
            if (mediaUrls != null && !mediaUrls.isEmpty()) { 
                existing.setMediaUrls(mediaUrls); 
                existing.setMimeTypes(mimeTypes); 
            }
            return mapToResponseDto(publicationRepository.save(existing));
        }).orElse(null);
    }

    public void deletePublication(String id) {
        publicationRepository.deleteById(id);
    }

    public PublicationResponseDto toggleSupport(String pubId, Long userId) {
        return publicationRepository.findById(pubId).map(pub -> {
            String currentIds = pub.getSupportIds();
            List<String> idList = (currentIds != null && !currentIds.trim().isEmpty())
                    ? new ArrayList<>(List.of(currentIds.split(","))) : new ArrayList<>();
            String uidStr = String.valueOf(userId);
            if (idList.contains(uidStr)) idList.remove(uidStr); else idList.add(uidStr);
            pub.setSupportIds(String.join(",", idList));
            return mapToResponseDto(publicationRepository.save(pub));
        }).orElse(null);
    }

    public PublicationResponseDto voteInPoll(String pubId, int optionIndex, Long userId) {
        return publicationRepository.findById(pubId).map(pub -> {
            if (pub.getType() == PublicationType.VOTE && pub.getPollOptions() != null && optionIndex < pub.getPollOptions().size()) {
                for (PublicationPollOption opt : pub.getPollOptions()) {
                    if (opt.getVoterIds().contains(userId)) { opt.getVoterIds().remove(userId); opt.setVotes(opt.getVoterIds().size()); }
                }
                PublicationPollOption option = pub.getPollOptions().get(optionIndex);
                option.getVoterIds().add(userId);
                option.setVotes(option.getVoterIds().size());
                return mapToResponseDto(publicationRepository.save(pub));
            }
            return mapToResponseDto(pub);
        }).orElse(null);
    }

    public PublicationResponseDto mapToResponseDto(Publication publication) {
        PublicationResponseDto dto = new PublicationResponseDto();
        dto.setId(publication.getId());
        dto.setContent(publication.getContent());
        
        // Support both new multi-media and legacy single media
        dto.setMediaUrls(publication.getMediaUrls());
        dto.setMimeTypes(publication.getMimeTypes());
        dto.setMediaUrl(publication.getMediaUrl()); // Backward compatibility
        dto.setMimeType(publication.getMimeType()); // Backward compatibility
        
        dto.setType(publication.getType());
        dto.setCreatedAt(publication.getCreatedAt());
        dto.setDistressed(publication.isDistressed());
        dto.setSentimentScore(publication.getSentimentScore());
        dto.setAnonymous(publication.isAnonymous());
        dto.setTags(publication.getTags());
        dto.setPollQuestion(publication.getPollQuestion());
        dto.setSupportIds(publication.getSupportIds());

        String sIds = publication.getSupportIds();
        dto.setSupportCount(sIds != null && !sIds.isEmpty() ? sIds.split(",").length : 0);

        dto.setGroupId(publication.getChatGroupId());
        dto.setGroupName(publication.getChatGroupName());

        if (publication.getPollOptions() != null) {
            dto.setPollOptions(publication.getPollOptions().stream().map(opt -> {
                PollOptionResponseDto optDto = new PollOptionResponseDto();
                optDto.setId(opt.getId());
                optDto.setText(opt.getText());
                optDto.setVotes(opt.getVotes());
                optDto.setVoterIds(opt.getVoterIds());
                return optDto;
            }).collect(Collectors.toList()));
        }

        if (publication.getAuthorId() != null) {
            if (publication.isAnonymous()) {
                dto.setAuthorId(null);
                dto.setAuthorName("Anonymous User");
            } else {
                dto.setAuthorId(publication.getAuthorId());
                Map<String, Object> author = userClient.getUserById(publication.getAuthorId());
                dto.setAuthorName(userClient.getFullName(author));
            }
        }

        if (publication.getComments() != null) {
            dto.setCommentCount(publication.getComments().size());
            dto.setComments(publication.getComments().stream().map(c -> {
                CommentResponseDto cdto = new CommentResponseDto();
                cdto.setId(c.getId());
                cdto.setContent(c.getContent());
                cdto.setCreatedAt(c.getCreatedAt());
                cdto.setAuthorId(c.getAuthorId());
                Map<String, Object> author = userClient.getUserById(c.getAuthorId());
                cdto.setAuthorName(userClient.getFullName(author));
                cdto.setPublicationId(publication.getId());
                return cdto;
            }).collect(Collectors.toList()));
        }

        dto.setShareCount(messageRepository.countBySharedPublicationId(publication.getId()));
        dto.setLinkedEventId(publication.getLinkedEventId());

        if (publication.getType() == PublicationType.EVENT && publication.getLinkedEventId() != null) {
            dto.setLinkedEvent(fetchEventPreview(publication.getLinkedEventId()));
        }

        return dto;
    }

    @SuppressWarnings("unchecked")
    private SharedEventPreviewDto fetchEventPreview(String eventId) {
        try {
            String url = mainServiceUrl + "/api/events/" + eventId;
            Map<String, Object> ev = restTemplate.getForObject(url, Map.class);
            if (ev == null) return null;
            SharedEventPreviewDto p = new SharedEventPreviewDto();
            p.setId(eventId);
            p.setTitle((String) ev.get("title"));
            p.setLocation((String) ev.get("location"));
            p.setDescription((String) ev.get("description"));
            p.setImageUrl((String) ev.get("imageUrl"));
            Object start = ev.get("startDateTime");
            if (start != null) p.setStartDateTime(start.toString());
            return p;
        } catch (Exception e) {
            System.err.println("[PublicationService] fetchEventPreview failed for id=" + eventId + " url=" + mainServiceUrl + " error=" + e.getMessage());
            return null;
        }
    }
}
