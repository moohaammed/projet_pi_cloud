package esprit.tn.collab.controllers.collaboration;

import esprit.tn.collab.dto.collaboration.HandoverDTO;
import esprit.tn.collab.dto.collaboration.admin.*;
import esprit.tn.collab.services.collaboration.AdminCollaborationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/collaboration")
@CrossOrigin(origins = "http://localhost:4200")
public class AdminCollaborationController {

    public static final String ADMIN_USER_HEADER = "X-Admin-User-Id";
    private final AdminCollaborationService adminCollaborationService;

    public AdminCollaborationController(AdminCollaborationService adminCollaborationService) {
        this.adminCollaborationService = adminCollaborationService;
    }

    @GetMapping("/health/kpis")
    public ResponseEntity<SystemHealthKpisDto> kpis(@RequestHeader(ADMIN_USER_HEADER) Long adminUserId) {
        return ResponseEntity.ok(adminCollaborationService.getSystemHealthKpis(adminUserId));
    }

    @GetMapping("/safety-logs")
    public ResponseEntity<List<SafetyAlertLogAdminDto>> safetyLogs(@RequestHeader(ADMIN_USER_HEADER) Long adminUserId) {
        return ResponseEntity.ok(adminCollaborationService.getSafetyLogs(adminUserId));
    }

    @GetMapping("/moderation/queue")
    public ResponseEntity<List<ModerationQueueItemDto>> moderationQueue(@RequestHeader(ADMIN_USER_HEADER) Long adminUserId) {
        return ResponseEntity.ok(adminCollaborationService.getModerationQueue(adminUserId));
    }

    @PostMapping("/moderation/{publicationId}/dismiss")
    public ResponseEntity<Void> dismissFlag(@RequestHeader(ADMIN_USER_HEADER) Long adminUserId, @PathVariable Long publicationId) {
        adminCollaborationService.dismissModerationFlag(adminUserId, publicationId); return ResponseEntity.ok().build();
    }

    @DeleteMapping("/moderation/{publicationId}")
    public ResponseEntity<Void> deletePost(@RequestHeader(ADMIN_USER_HEADER) Long adminUserId, @PathVariable Long publicationId) {
        adminCollaborationService.deleteModeratedPost(adminUserId, publicationId); return ResponseEntity.ok().build();
    }

    @PostMapping("/users/{userId}/suspend")
    public ResponseEntity<Void> suspendUser(@RequestHeader(ADMIN_USER_HEADER) Long adminUserId, @PathVariable Long userId) {
        adminCollaborationService.suspendUser(adminUserId, userId); return ResponseEntity.ok().build();
    }

    @GetMapping("/analytics/stress-trend")
    public ResponseEntity<PlatformStressTrendDto> stressTrend(@RequestHeader(ADMIN_USER_HEADER) Long adminUserId,
                                                               @RequestParam(defaultValue = "7") int days) {
        return ResponseEntity.ok(adminCollaborationService.getPlatformStressTrend(adminUserId, days));
    }

    @PostMapping("/analytics/retroactive-scan")
    public ResponseEntity<Void> retroactiveScan(@RequestHeader(ADMIN_USER_HEADER) Long adminUserId) {
        adminCollaborationService.retroactiveSafetyScan(adminUserId); return ResponseEntity.ok().build();
    }

    @GetMapping("/groups")
    public ResponseEntity<List<ChatGroupAdminDto>> getAllGroups(@RequestHeader(ADMIN_USER_HEADER) Long adminUserId) {
        return ResponseEntity.ok(adminCollaborationService.getAllGroups(adminUserId));
    }

    @DeleteMapping("/groups/{groupId}")
    public ResponseEntity<Void> deleteGroup(@RequestHeader(ADMIN_USER_HEADER) Long adminUserId, @PathVariable Long groupId) {
        adminCollaborationService.deleteGroup(adminUserId, groupId); return ResponseEntity.ok().build();
    }

    @PutMapping("/groups/{groupId}")
    public ResponseEntity<Void> updateGroup(@RequestHeader(ADMIN_USER_HEADER) Long adminUserId, @PathVariable Long groupId,
                                            @RequestBody ChatGroupAdminDto dto) {
        adminCollaborationService.updateGroup(adminUserId, groupId, dto); return ResponseEntity.ok().build();
    }

    @PostMapping("/announcement")
    public ResponseEntity<Void> postAnnouncement(@RequestHeader(ADMIN_USER_HEADER) Long adminUserId,
                                                 @RequestBody Map<String, Object> payload) {
        String content = (String) payload.get("content");
        Long groupId = payload.get("groupId") != null ? Long.valueOf(payload.get("groupId").toString()) : null;
        Instant scheduledAt = payload.get("scheduledAt") != null ? Instant.parse(payload.get("scheduledAt").toString()) : null;
        adminCollaborationService.createAdminAnnouncement(adminUserId, content, groupId, scheduledAt);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/announcements/scheduled")
    public ResponseEntity<List<?>> getScheduledAnnouncements(@RequestHeader(ADMIN_USER_HEADER) Long adminUserId) {
        return ResponseEntity.ok(adminCollaborationService.getScheduledAnnouncements(adminUserId));
    }

    @GetMapping("/users/{userId}/groups")
    public ResponseEntity<List<ChatGroupAdminDto>> getUserGroups(@RequestHeader(ADMIN_USER_HEADER) Long adminUserId, @PathVariable Long userId) {
        return ResponseEntity.ok(adminCollaborationService.getUserGroups(adminUserId, userId));
    }

    @PostMapping("/moderation/{publicationId}/approve")
    public ResponseEntity<Void> approvePost(@RequestHeader(ADMIN_USER_HEADER) Long adminUserId, @PathVariable Long publicationId) {
        adminCollaborationService.dismissModerationFlag(adminUserId, publicationId); return ResponseEntity.ok().build();
    }

    @PostMapping("/moderation/users/{userId}/ban")
    public ResponseEntity<Void> banUser(@RequestHeader(ADMIN_USER_HEADER) Long adminUserId, @PathVariable Long userId) {
        adminCollaborationService.suspendUser(adminUserId, userId); return ResponseEntity.ok().build();
    }

    @GetMapping("/privacy/direct-messages/metadata")
    public ResponseEntity<List<DirectMessageMetadataDto>> dmMetadata(@RequestHeader(ADMIN_USER_HEADER) Long adminUserId) {
        return ResponseEntity.ok(adminCollaborationService.getDirectMessageMetadata(adminUserId));
    }

    @GetMapping("/analytics/engagement-mix")
    public ResponseEntity<EngagementMixDto> getEngagementMix(@RequestHeader(ADMIN_USER_HEADER) Long adminUserId) {
        return ResponseEntity.ok(adminCollaborationService.getEngagementMix(adminUserId));
    }

    @GetMapping("/analytics/sentiment-distribution")
    public ResponseEntity<SentimentDistributionDto> getSentimentDistribution(@RequestHeader(ADMIN_USER_HEADER) Long adminUserId) {
        return ResponseEntity.ok(adminCollaborationService.getSentimentDistribution(adminUserId));
    }

    @GetMapping("/analytics/ai-impact")
    public ResponseEntity<AiImpactDto> getAiImpact(@RequestHeader(ADMIN_USER_HEADER) Long adminUserId) {
        return ResponseEntity.ok(adminCollaborationService.getAiImpact(adminUserId));
    }

    @GetMapping("/analytics/clinical-pulse")
    public ResponseEntity<ClinicalPulseDto> getPulse(@RequestHeader(ADMIN_USER_HEADER) Long adminUserId) {
        return ResponseEntity.ok(adminCollaborationService.getClinicalPulse(adminUserId));
    }

    @GetMapping("/analytics/retrospective")
    public ResponseEntity<HandoverDTO> getRetrospective(@RequestHeader(ADMIN_USER_HEADER) Long adminUserId,
                                                         @RequestParam Long groupId,
                                                         @RequestParam(defaultValue = "24") int hours) {
        return ResponseEntity.ok(adminCollaborationService.getRetrospective(adminUserId, groupId, hours));
    }
}
