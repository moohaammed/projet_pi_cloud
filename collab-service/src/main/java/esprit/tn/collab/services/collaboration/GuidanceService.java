package esprit.tn.collab.services.collaboration;

import esprit.tn.collab.clients.UserClient;
import esprit.tn.collab.dto.collaboration.GuidanceResponseDto;
import esprit.tn.collab.dto.collaboration.VoicePromptRequestDto;
import esprit.tn.collab.entities.collaboration.AppGuidance;
import esprit.tn.collab.repositories.collaboration.AppGuidanceRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class GuidanceService {

    // Words that make a sentence hard to speak — stripped during simplification
    private static final Pattern COMPLEX_TOKENS = Pattern.compile(
            "\\b(successfully|notification|collaboration|configuration|authentication|approximately|immediately)\\b",
            Pattern.CASE_INSENSITIVE);

    // Anything inside parentheses or brackets is noise for TTS
    private static final Pattern PARENTHETICAL = Pattern.compile("\\(.*?\\)|\\[.*?]");

    // Max words before we truncate to keep sentences speakable
    private static final int MAX_WORDS = 20;

    private final AppGuidanceRepository guidanceRepository;
    private final NotificationService notificationService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserClient userClient;

    public GuidanceService(AppGuidanceRepository guidanceRepository,
                           NotificationService notificationService,
                           SimpMessagingTemplate messagingTemplate,
                           UserClient userClient) {
        this.guidanceRepository = guidanceRepository;
        this.notificationService = notificationService;
        this.messagingTemplate = messagingTemplate;
        this.userClient = userClient;
    }

    // ─── Contextual Help ────────────────────────────────────────────────────────

    
    public GuidanceResponseDto getGuidanceForPage(String pageName) {
        AppGuidance guidance = guidanceRepository.findByPageName(pageName.toLowerCase())
                .orElse(buildDefaultGuidance(pageName));
        return toDto(guidance);
    }

    public List<GuidanceResponseDto> getAllGuidance() {
        return guidanceRepository.findAll().stream().map(this::toDto).toList();
    }

    // ─── Caregiver CRUD ─────────────────────────────────────────────────────────

    
    public GuidanceResponseDto upsertGuidance(String pageName, List<String> instructions,
                                               String pageLabel, Long caregiverId) {
        assertCaregiverRole(caregiverId);

        AppGuidance guidance = guidanceRepository.findByPageName(pageName.toLowerCase())
                .orElse(new AppGuidance());

        guidance.setPageName(pageName.toLowerCase());
        guidance.setPageLabel(pageLabel != null ? pageLabel : pageName);
        guidance.setInstructions(instructions.stream().map(this::simplifyForTts).toList());
        guidance.setUpdatedAt(Instant.now());
        guidance.setUpdatedByUserId(caregiverId);

        return toDto(guidanceRepository.save(guidance));
    }

    public void deleteGuidance(String pageName, Long caregiverId) {
        assertCaregiverRole(caregiverId);
        guidanceRepository.findByPageName(pageName.toLowerCase())
                .ifPresent(guidanceRepository::delete);
    }

    // ─── Voice Prompt Push ──────────────────────────────────────────────────────

    
    public void sendVoicePrompt(VoicePromptRequestDto request) {
        assertCaregiverRole(request.getCaregiverId());

        String simplified = simplifyForTts(request.getMessage());

        // Real-time push — frontend listens on /user/queue/voice-prompt
        // and calls window.speechSynthesis.speak() on receipt
        Map<String, String> payload = Map.of(
                "type", "VOICE_PROMPT",
                "text", simplified
        );
        messagingTemplate.convertAndSendToUser(
                request.getTargetPatientId().toString(),
                "/queue/voice-prompt",
                payload
        );

        // Persistent fallback — patient sees it as a notification if offline
        notificationService.createAndSend(
                request.getTargetPatientId(),
                simplified,
                "VOICE_PROMPT"
        );
    }

    // ─── TTS Simplification Logic ────────────────────────────────────────────────

    
    public String simplifyForTts(String raw) {
        if (raw == null || raw.isBlank()) return "";

        String text = PARENTHETICAL.matcher(raw).replaceAll("").trim();
        text = COMPLEX_TOKENS.matcher(text).replaceAll(match -> simpleSynonym(match.group()));

        // Truncate to MAX_WORDS
        String[] words = text.split("\\s+");
        if (words.length > MAX_WORDS) {
            text = String.join(" ", java.util.Arrays.copyOf(words, MAX_WORDS));
        }

        text = text.trim();
        if (!text.isEmpty() && !text.endsWith(".") && !text.endsWith("!") && !text.endsWith("?")) {
            text = text + ".";
        }
        return text;
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    private String simpleSynonym(String word) {
        return switch (word.toLowerCase()) {
            case "successfully"    -> "done";
            case "notification"    -> "message";
            case "collaboration"   -> "teamwork";
            case "configuration"   -> "settings";
            case "authentication"  -> "login";
            case "approximately"   -> "about";
            case "immediately"     -> "now";
            default                -> word;
        };
    }

    private void assertCaregiverRole(Long userId) {
        if (userId == null) throw new IllegalArgumentException("Caregiver ID is required.");
        Map<String, Object> user = userClient.getUserById(userId);
        boolean allowed = userClient.isRole(user, "RELATION") || userClient.isRole(user, "DOCTOR");
        if (!allowed) throw new SecurityException("Only caregivers (RELATION or DOCTOR) can manage guidance.");
    }

    private GuidanceResponseDto toDto(AppGuidance g) {
        GuidanceResponseDto dto = new GuidanceResponseDto();
        dto.setPageName(g.getPageName());
        dto.setPageLabel(g.getPageLabel());
        dto.setInstructions(g.getInstructions());
        dto.setFullScript(String.join(" ", g.getInstructions()));
        return dto;
    }

    
    private AppGuidance buildDefaultGuidance(String pageName) {
        List<String> instructions = switch (pageName.toLowerCase()) {
            case "feed"      -> List.of(
                    "This is your home page.",
                    "You can see posts from your group here.",
                    "Press the blue button to write a new post.",
                    "Press the heart button to show support.");
            case "messenger" -> List.of(
                    "This is your messages page.",
                    "Press a name to open a conversation.",
                    "Type your message at the bottom and press send.");
            case "groups"    -> List.of(
                    "This is your groups page.",
                    "Press a group name to enter it.",
                    "Press the plus button to create a new group.");
            case "profile"   -> List.of(
                    "This is your profile page.",
                    "You can see your information here.",
                    "Press edit to change your details.");
            case "notifications" -> List.of(
                    "This is your notifications page.",
                    "Each item is a new message or update for you.",
                    "Press an item to open it.");
            default          -> List.of("Welcome. Please ask your caregiver for help with this page.");
        };

        AppGuidance g = new AppGuidance();
        g.setPageName(pageName.toLowerCase());
        g.setPageLabel(capitalize(pageName));
        g.setInstructions(instructions);
        return g;
    }

    private String capitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1).toLowerCase();
    }
}
