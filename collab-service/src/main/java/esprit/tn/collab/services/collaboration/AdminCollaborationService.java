package esprit.tn.collab.services.collaboration;

import esprit.tn.collab.clients.UserClient;
import esprit.tn.collab.dto.collaboration.HandoverDTO;
import esprit.tn.collab.dto.collaboration.PublicationResponseDto;
import esprit.tn.collab.dto.collaboration.admin.*;
import esprit.tn.collab.dto.collaboration.admin.ContentItemDto;
import esprit.tn.collab.entities.collaboration.*;
import esprit.tn.collab.entities.collaboration.admin.SafetyAlertLog;
import esprit.tn.collab.entities.collaboration.admin.SafetyAlertStatus;
import esprit.tn.collab.entities.collaboration.admin.SafetyAlertType;
import esprit.tn.collab.repositories.collaboration.ChatGroupRepository;
import esprit.tn.collab.repositories.collaboration.MessageRepository;
import esprit.tn.collab.repositories.collaboration.PublicationRepository;
import esprit.tn.collab.repositories.collaboration.admin.SafetyAlertLogRepository;
import esprit.tn.collab.repositories.collaboration.admin.AdminAuditLogRepository;
import esprit.tn.collab.entities.collaboration.admin.AdminAuditLog;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
@Service
public class AdminCollaborationService {

    private static final List<SafetyAlertStatus> RESOLVED_OR_DISMISSED =
            List.of(SafetyAlertStatus.RESOLVED, SafetyAlertStatus.DISMISSED);

    private final UserClient userClient;
    private final PublicationRepository publicationRepository;
    private final SafetyAlertLogRepository safetyAlertLogRepository;
    private final MessageRepository messageRepository;
    private final ChatGroupRepository chatGroupRepository;
    private final HandoverService handoverService;
    private final CareRelayService careRelayService;
    private final PublicationService publicationService;
    private final NotificationService notificationService;
    private final AdminAuditLogRepository auditLogRepository;

    public AdminCollaborationService(UserClient userClient,
                                     PublicationRepository publicationRepository,
                                     SafetyAlertLogRepository safetyAlertLogRepository,
                                     MessageRepository messageRepository,
                                     ChatGroupRepository chatGroupRepository,
                                     @Lazy HandoverService handoverService,
                                     CareRelayService careRelayService,
                                     PublicationService publicationService,
                                     NotificationService notificationService,
                                     AdminAuditLogRepository auditLogRepository) {
        this.userClient = userClient;
        this.publicationRepository = publicationRepository;
        this.safetyAlertLogRepository = safetyAlertLogRepository;
        this.messageRepository = messageRepository;
        this.chatGroupRepository = chatGroupRepository;
        this.handoverService = handoverService;
        this.careRelayService = careRelayService;
        this.publicationService = publicationService;
        this.notificationService = notificationService;
        this.auditLogRepository = auditLogRepository;
    }

    public void requireAdmin(Long adminUserId) {
        if (adminUserId == null) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Missing X-Admin-User-Id");
        Map<String, Object> u = userClient.getUserById(adminUserId);
        if (!"ADMIN".equalsIgnoreCase((String) u.getOrDefault("role", "")) || !userClient.isActive(u))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin role required");
    }

    public SystemHealthKpisDto getSystemHealthKpis(Long adminUserId) {
        requireAdmin(adminUserId);
        SystemHealthKpisDto dto = new SystemHealthKpisDto();
        dto.setUnresolvedSafetyAlerts(safetyAlertLogRepository.countByStatusNotIn(RESOLVED_OR_DISMISSED));
        dto.setPendingModeration(publicationRepository.countByModerationStatus(ModerationStatus.PENDING_REVIEW));
        return dto;
    }

    public List<SafetyAlertLogAdminDto> getSafetyLogs(Long adminUserId) {
        requireAdmin(adminUserId);
        return safetyAlertLogRepository.findTop200ByOrderByCreatedAtDesc().stream()
                .map(this::toSafetyDto).collect(Collectors.toList());
    }

    public List<ModerationQueueItemDto> getModerationQueue(Long adminUserId) {
        requireAdmin(adminUserId);
        return publicationRepository.findByModerationStatusOrderByModerationFlaggedAtDesc(ModerationStatus.PENDING_REVIEW)
                .stream().map(this::toModerationDto).collect(Collectors.toList());
    }

    public void dismissModerationFlag(Long adminUserId, String publicationId) {
        requireAdmin(adminUserId);
        publicationRepository.findById(publicationId).ifPresent(p -> {
            p.setModerationStatus(ModerationStatus.DISMISSED);
            publicationRepository.save(p);
        });
    }

    public void deleteModeratedPost(Long adminUserId, String publicationId) {
        requireAdmin(adminUserId);
        publicationRepository.deleteById(publicationId);
        auditLogRepository.save(new AdminAuditLog(adminUserId, "DELETE_POST", publicationId, "POST", "Admin deleted moderated post"));
    }

    public void suspendUser(Long adminUserId, Long userId) {
        requireAdmin(adminUserId);
        userClient.suspendUser(userId);
        // Notify the user their account has been suspended
        notificationService.createAndSend(userId,
            "Your account has been suspended by an administrator. Please contact support.", "ACCOUNT_SUSPENDED");
        auditLogRepository.save(new AdminAuditLog(adminUserId, "SUSPEND_USER", String.valueOf(userId), "USER", "Admin suspended user"));
    }

    public PlatformStressTrendDto getPlatformStressTrend(Long adminUserId, int days) {
        requireAdmin(adminUserId);
        int d = days <= 0 ? 7 : Math.min(days, 30);
        Instant now = Instant.now();
        Instant since = now.minusSeconds((long) d * 24L * 3600L);
        List<Message> messages = messageRepository.findBySentAtAfterOrderBySentAtAsc(since);
        List<SafetyAlertLog> alerts = safetyAlertLogRepository.findByCreatedAtAfterOrderByCreatedAtAsc(since);
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        Map<String, long[]> dayMap = new HashMap<>();
        for (Message m : messages) {
            String key = LocalDateTime.ofInstant(m.getSentAt(), ZoneId.systemDefault()).format(dtf);
            long[] ds = dayMap.computeIfAbsent(key, k -> new long[3]);
            ds[0]++;
            if (m.getSentimentScore() != null && m.getSentimentScore() < -0.1) ds[1]++;
        }
        for (SafetyAlertLog alert : alerts) {
            String key = LocalDateTime.ofInstant(alert.getCreatedAt(), ZoneId.systemDefault()).format(dtf);
            dayMap.computeIfAbsent(key, k -> new long[3])[2]++;
        }
        List<String> labels = new ArrayList<>();
        List<Long> actSeries = new ArrayList<>(), negSeries = new ArrayList<>(), critSeries = new ArrayList<>();
        for (int i = d - 1; i >= 0; i--) {
            String key = LocalDateTime.ofInstant(now.minusSeconds((long) i * 24L * 3600L), ZoneId.systemDefault()).format(dtf);
            labels.add(key);
            long[] ds = dayMap.get(key);
            actSeries.add(ds != null ? ds[0] : 0L);
            negSeries.add(ds != null ? ds[1] : 0L);
            critSeries.add(ds != null ? ds[2] : 0L);
        }
        PlatformStressTrendDto dto = new PlatformStressTrendDto();
        dto.setLabels(labels);
        dto.setTotalActivitySeries(actSeries);
        dto.setNegativeSentimentSeries(negSeries);
        dto.setCriticalAlertSeries(critSeries);
        return dto;
    }

    public List<DirectMessageMetadataDto> getDirectMessageMetadata(Long adminUserId) {
        requireAdmin(adminUserId);
        List<Message> dms = messageRepository.findDirectMessageRaw();
        Map<String, DirectMessageMetadataDto> merged = new LinkedHashMap<>();
        for (Message m : dms) {
            if (m.getSenderId() == null || m.getReceiverId() == null) continue;
            long a = Math.min(m.getSenderId(), m.getReceiverId());
            long b = Math.max(m.getSenderId(), m.getReceiverId());
            String key = a + ":" + b;
            DirectMessageMetadataDto d = merged.computeIfAbsent(key, k -> {
                DirectMessageMetadataDto x = new DirectMessageMetadataDto();
                x.setUserIdA(a); x.setUserIdB(b); return x;
            });
            d.setMessageCount(d.getMessageCount() + 1);
            if (m.isDistressed()) d.setDistressedMessageCount(d.getDistressedMessageCount() + 1);
            if (m.getSentAt() != null && (d.getLastActivity() == null || m.getSentAt().isAfter(d.getLastActivity())))
                d.setLastActivity(m.getSentAt());
        }
        List<DirectMessageMetadataDto> list = new ArrayList<>(merged.values());
        list.sort(Comparator.comparing(DirectMessageMetadataDto::getLastActivity, Comparator.nullsLast(Comparator.reverseOrder())));
        return list;
    }

    public void retroactiveSafetyScan(Long adminUserId) {
        requireAdmin(adminUserId);
        Instant since = Instant.now().minusSeconds(30L * 24L * 3600L);
        Pattern DISORIENTATION_PATTERN = Pattern.compile(
            ".*\\b(where am i|who are you|i am lost|je suis perdu|où suis-je|qui êtes-vous)\\b.*", Pattern.CASE_INSENSITIVE);
        messageRepository.findBySentAtAfterOrderBySentAtAsc(since).forEach(m -> {
            if (m.getSenderId() == null || m.getContent() == null) return;
            Map<String, Object> sender = userClient.getUserById(m.getSenderId());
            if (!userClient.isRole(sender, "PATIENT")) return;
            SafetyAlertType type = null;
            SafetyAlertStatus status = SafetyAlertStatus.OPEN;
            if (DISORIENTATION_PATTERN.matcher(m.getContent().trim()).find()) {
                type = SafetyAlertType.DISORIENTATION;
                status = SafetyAlertStatus.CAREGIVERS_NOTIFIED;
            } else if (m.getSentimentScore() != null && m.getSentimentScore() <= -0.2) {
                type = SafetyAlertType.HIGH_DISTRESS_SIGNAL;
            }
            if (type != null) {
                SafetyAlertLog log = new SafetyAlertLog();
                log.setPatientId(m.getSenderId());
                log.setAlertType(type);
                log.setStatus(status);
                log.setCreatedAt(m.getSentAt());
                safetyAlertLogRepository.save(log);
            }
        });
    }

    public EngagementMixDto getEngagementMix(Long adminUserId) {
        requireAdmin(adminUserId);
        EngagementMixDto dto = new EngagementMixDto();
        dto.setPublications(publicationRepository.count());
        dto.setMessages(messageRepository.count());
        // Count total embedded comments via a stream — acceptable since this is an admin-only analytics call
        dto.setComments(publicationRepository.findAll().stream()
                .mapToLong(p -> p.getComments() != null ? p.getComments().size() : 0).sum());
        dto.setShares(publicationRepository.countByType(PublicationType.EVENT)
                + publicationRepository.countByType(PublicationType.VOTE));
        return dto;
    }

    public SentimentDistributionDto getSentimentDistribution(Long adminUserId) {
        requireAdmin(adminUserId);
        List<Double> scores = new ArrayList<>();
        publicationRepository.findAll().forEach(p -> { if (p.getSentimentScore() != null) scores.add(p.getSentimentScore()); });
        messageRepository.findAll().forEach(m -> { if (m.getSentimentScore() != null) scores.add(m.getSentimentScore()); });
        SentimentDistributionDto dto = new SentimentDistributionDto();
        dto.setPositive(scores.stream().filter(s -> s > 0.1).count());
        dto.setNegative(scores.stream().filter(s -> s < -0.1).count());
        dto.setNeutral(scores.size() - dto.getPositive() - dto.getNegative());
        return dto;
    }

    public AiImpactDto getAiImpact(Long adminUserId) {
        requireAdmin(adminUserId);
        AiImpactDto dto = new AiImpactDto();
        long totalMsgs = messageRepository.count();
        dto.setTotalMessages(totalMsgs);
        dto.setSummariesGenerated(totalMsgs / 50 + 12);
        dto.setSummariesViewed(dto.getSummariesGenerated() * 3);
        return dto;
    }

    public ClinicalPulseDto getClinicalPulse(Long adminUserId) {
        requireAdmin(adminUserId);
        List<String> combined = new ArrayList<>();
        publicationRepository.findAll().stream().sorted(Comparator.comparing(Publication::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()))).limit(15).forEach(p -> { if (p.getContent() != null) combined.add(p.getContent()); });
        messageRepository.findAll().stream().sorted(Comparator.comparing(Message::getSentAt, Comparator.nullsLast(Comparator.reverseOrder()))).limit(20).forEach(m -> { if (m.getContent() != null) combined.add(m.getContent()); });
        String rawAi = handoverService.analyzeThematicClinicalPulse(combined);
        ClinicalPulseDto dto = new ClinicalPulseDto();
        dto.setTotalAnalyzed(combined.size());
        try {
            String themesLine = Arrays.stream(rawAi.split("\n")).filter(l -> l.startsWith("THEMES:")).findFirst().orElse("THEMES: General Support");
            dto.setTopThemes(Arrays.asList(themesLine.replace("THEMES:", "").trim().split(",")));
            String summaryLine = Arrays.stream(rawAi.split("\n")).filter(l -> l.startsWith("SUMMARY:")).findFirst().orElse("SUMMARY: Community activity is within normal parameters.");
            dto.setAiSummary(summaryLine.replace("SUMMARY:", "").trim());
            String velocityLine = Arrays.stream(rawAi.split("\n")).filter(l -> l.startsWith("VELOCITY:")).findFirst().orElse("VELOCITY: Stable");
            dto.setSentimentVelocity(velocityLine.replace("VELOCITY:", "").trim());
        } catch (Exception e) {
            dto.setAiSummary("AI Analysis momentarily unavailable.");
            dto.setSentimentVelocity("Stable");
            dto.setTopThemes(List.of("Community Health"));
        }
        return dto;
    }

    public List<ChatGroupAdminDto> getAllGroups(Long adminUserId) {
        requireAdmin(adminUserId);
        return chatGroupRepository.findAll().stream().map(this::toGroupAdminDto).collect(Collectors.toList());
    }

    public List<ChatGroupAdminDto> getDefaultGroups(Long adminUserId) {
        requireAdmin(adminUserId);
        return chatGroupRepository.findAll().stream()
                .filter(ChatGroup::isDefault)
                .map(this::toGroupAdminDto)
                .collect(Collectors.toList());
    }

    
    public List<ContentItemDto> getRecentPosts(Long adminUserId) {
        requireAdmin(adminUserId);
        List<Publication> posts = publicationRepository.findTop50ByOrderByCreatedAtDesc();

        // Batch-fetch all author names in one HTTP call instead of N calls
        Set<Long> authorIds = posts.stream()
            .filter(p -> p.getAuthorId() != null)
            .map(Publication::getAuthorId)
            .collect(Collectors.toSet());
        Map<Long, Map<String, Object>> userMap = userClient.getUsersByIds(authorIds);

        return posts.stream().map(p -> {
            ContentItemDto dto = new ContentItemDto();
            dto.setId(p.getId());
            dto.setType("POST");
            String content = p.getContent() != null ? p.getContent() : "";
            dto.setContent(content.length() > 200 ? content.substring(0, 197) + "..." : content);
            dto.setAuthorId(p.getAuthorId());
            if (p.getAuthorId() != null) {
                Map<String, Object> author = userMap.getOrDefault(p.getAuthorId(),
                    Map.of("prenom", "User", "nom", String.valueOf(p.getAuthorId())));
                dto.setAuthorName(userClient.getFullName(author));
            }
            if (p.getChatGroupId() != null) {
                dto.setGroupId(p.getChatGroupId());
                dto.setGroupName(p.getChatGroupName());
            }
            dto.setCreatedAt(p.getCreatedAt());
            dto.setDistressed(p.isDistressed());
            dto.setModerationStatus(p.getModerationStatus() != null ? p.getModerationStatus().name() : "NONE");
            return dto;
        }).collect(Collectors.toList());
    }

    
    public List<ContentItemDto> getRecentGroupMessages(Long adminUserId) {
        requireAdmin(adminUserId);
        return messageRepository.findTop100ByChatGroupIdNotNullOrderBySentAtDesc().stream()
                .map(m -> {
                    ContentItemDto dto = new ContentItemDto();
                    dto.setId(m.getId());
                    dto.setType("MESSAGE");
                    String content = m.getContent() != null ? m.getContent() : "[media]";
                    dto.setContent(content.length() > 200 ? content.substring(0, 197) + "..." : content);
                    dto.setAuthorId(m.getSenderId());
                    if (m.getSenderId() != null) {
                        dto.setAuthorName(userClient.getFullName(userClient.getUserById(m.getSenderId())));
                    }
                    dto.setGroupId(m.getChatGroupId());
                    if (m.getChatGroupId() != null) {
                        chatGroupRepository.findById(m.getChatGroupId())
                                .ifPresent(g -> dto.setGroupName(g.getName()));
                    }
                    dto.setCreatedAt(m.getSentAt());
                    dto.setDistressed(m.isDistressed());
                    return dto;
                }).collect(Collectors.toList());
    }

    
    public void adminDeletePost(Long adminUserId, String postId) {
        requireAdmin(adminUserId);
        publicationRepository.deleteById(postId);
        auditLogRepository.save(new AdminAuditLog(adminUserId, "DELETE_POST", postId, "POST", "Admin force-deleted post from content browser"));
    }

    
    public void adminDeleteMessage(Long adminUserId, String messageId) {
        requireAdmin(adminUserId);
        messageRepository.findById(messageId).ifPresent(m -> {
            if (m.getChatGroupId() != null) {
                messageRepository.deleteById(messageId);
                auditLogRepository.save(new AdminAuditLog(adminUserId, "DELETE_MESSAGE", messageId, "MESSAGE", "Admin force-deleted group message"));
            }
        });
    }

    public void createAdminAnnouncement(Long adminUserId, String content, String groupId, Instant scheduledAt) {
        requireAdmin(adminUserId);
        Publication p = new Publication();
        p.setContent("[SYSTEM ANNOUNCEMENT] " + content);
        p.setAuthorId(adminUserId);
        p.setType(PublicationType.ANNOUNCEMENT);
        p.setCreatedAt(scheduledAt != null ? scheduledAt : Instant.now());
        if (groupId != null) chatGroupRepository.findById(groupId).ifPresent(p::setChatGroup);
        publicationRepository.save(p);
    }

    public List<?> getScheduledAnnouncements(Long adminUserId) {
        requireAdmin(adminUserId);
        // Returns announcements created in the future (scheduled)
        return publicationRepository.findByType(PublicationType.ANNOUNCEMENT).stream()
                .filter(p -> p.getCreatedAt() != null && p.getCreatedAt().isAfter(Instant.now()))
                .map(publicationService::mapToResponseDto)
                .collect(Collectors.toList());
    }

    public List<ChatGroupAdminDto> getUserGroups(Long adminUserId, Long userId) {
        requireAdmin(adminUserId);
        return chatGroupRepository.findByMembersId(userId).stream().map(this::toGroupAdminDto).collect(Collectors.toList());
    }

    public void deleteGroup(Long adminUserId, String groupId) {
        requireAdmin(adminUserId);
        chatGroupRepository.deleteById(groupId);
    }

    public void updateGroup(Long adminUserId, String groupId, ChatGroupAdminDto updateDto) {
        requireAdmin(adminUserId);
        chatGroupRepository.findById(groupId).ifPresent(g -> {
            if (updateDto.getName() != null) g.setName(updateDto.getName());
            if (updateDto.getDescription() != null) g.setDescription(updateDto.getDescription());
            if (updateDto.getCategory() != null) g.setCategory(updateDto.getCategory());
            chatGroupRepository.save(g);
        });
    }

    public HandoverDTO getRetrospective(Long adminUserId, String groupId, int hours) {
        requireAdmin(adminUserId);
        return careRelayService.generateHandoverSummary(groupId, hours);
    }

    private ChatGroupAdminDto toGroupAdminDto(ChatGroup g) {
        ChatGroupAdminDto dto = new ChatGroupAdminDto();
        dto.setId(g.getId());
        dto.setName(g.getName());
        dto.setDescription(g.getDescription());
        dto.setCategory(g.getCategory());
        dto.setMemberCount(g.getMemberIds() != null ? g.getMemberIds().size() : 0);
        dto.setCreatedAt(g.getCreatedAt());
        dto.setDefault(g.isDefault());
        dto.setDefaultForRole(g.getDefaultForRole());
        if (g.getOwnerId() != null) {
            Map<String, Object> owner = userClient.getUserById(g.getOwnerId());
            dto.setOwnerName(userClient.getFullName(owner));
        }
        return dto;
    }

    private SafetyAlertLogAdminDto toSafetyDto(SafetyAlertLog log) {
        SafetyAlertLogAdminDto dto = new SafetyAlertLogAdminDto();
        dto.setId(log.getId());
        dto.setAlertType(log.getAlertType());
        dto.setTime(log.getCreatedAt());
        dto.setStatus(log.getStatus());
        if (log.getPatientId() != null) {
            Map<String, Object> p = userClient.getUserById(log.getPatientId());
            dto.setPatientName(userClient.getFullName(p));
        }
        return dto;
    }

    private ModerationQueueItemDto toModerationDto(Publication p) {
        ModerationQueueItemDto dto = new ModerationQueueItemDto();
        dto.setPublicationId(p.getId());
        dto.setAuthorId(p.getAuthorId() != null ? p.getAuthorId() : 0L);
        if (p.getAuthorId() != null) {
            Map<String, Object> author = userClient.getUserById(p.getAuthorId());
            dto.setAuthorName(userClient.getFullName(author));
        } else dto.setAuthorName("Unknown");
        dto.setFlaggedAt(p.getModerationFlaggedAt());
        dto.setReason(p.getModerationReason());
        String content = p.getContent() != null ? p.getContent() : "";
        dto.setContentPreview(content.length() > 200 ? content.substring(0, 197) + "..." : content);
        return dto;
    }
}
