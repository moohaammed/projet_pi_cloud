package esprit.tn.collab.services.collaboration;

import esprit.tn.collab.entities.collaboration.Message;
import esprit.tn.collab.repositories.collaboration.MessageRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class HandoverService {

    private final MessageRepository messageRepository;
    private final RestTemplate restTemplate;

    @Value("${spring.ai.google.gemini.api-key}")
    private String apiKey;

    @Value("${spring.ai.google.gemini.model-id:gemini-1.5-flash}")
    private String modelId;

    private String cachedPulse;
    private Instant lastPulseUpdate;
    private static final long CACHE_TTL_SECONDS = 300;

    public HandoverService(MessageRepository messageRepository) {
        this.messageRepository = messageRepository;
        this.restTemplate = new RestTemplate();
    }

    public String generateHandoverSummary(Long groupId, int hours) {
        Instant since = Instant.now().minus(hours, java.time.temporal.ChronoUnit.HOURS);
        List<Message> messages = messageRepository.findByChatGroupIdAndSentAtAfterOrderBySentAtAsc(groupId, since);

        if (messages.isEmpty()) {
            return "No messages recorded in the last " + hours + " hours to summarize.";
        }

        String messagesText = messages.stream().limit(50)
                .map(msg -> {
                    String senderName = msg.getSenderId() != null ? "User " + msg.getSenderId() : "System/Bot";
                    return senderName + ": " + msg.getContent();
                })
                .collect(Collectors.joining("\n"));

        String promptText = "You are a Senior Clinical Nurse Coordinator. Analyze these caregiver messages for an Alzheimer's support group. "
                + "Generate a professional 'Clinical Handover' in exactly 3 sections:\n"
                + "1. 🧠 PATIENT COGNITION & MOOD\n2. 💊 CARE LOGISTICS\n3. 🚨 RECOMMENDATIONS\n\n"
                + "Messages:\n" + messagesText;

        return callGemini(promptText);
    }

    @SuppressWarnings("unchecked")
    private String callGemini(String prompt) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            return "AI Intelligence Offline: No API Key configured.";
        }
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelId + ":generateContent?key=" + apiKey;
        HttpHeaders headers = new HttpHeaders();
        headers.set("x-goog-api-key", apiKey);
        Map<String, Object> requestBody = new HashMap<>();
        Map<String, Object> content = new HashMap<>();
        Map<String, Object> part = new HashMap<>();
        part.put("text", prompt);
        content.put("parts", List.of(part));
        requestBody.put("contents", List.of(content));
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
        try {
            Map<String, Object> response = restTemplate.postForObject(url, entity, Map.class);
            if (response != null && response.containsKey("candidates")) {
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
                if (!candidates.isEmpty()) {
                    Map<String, Object> contentMap = (Map<String, Object>) candidates.get(0).get("content");
                    List<Map<String, Object>> parts = (List<Map<String, Object>>) contentMap.get("parts");
                    return (String) parts.get(0).get("text");
                }
            }
            return "AI analysis returned unexpected format.";
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            return e.getStatusCode().value() == 403 ? "AI Service Offline: Access Denied." : "AI Service Error: " + e.getStatusText();
        } catch (Exception e) {
            return "AI Service Unavailable.";
        }
    }

    public String analyzeThematicClinicalPulse(List<String> contentSnippets) {
        if (contentSnippets.isEmpty()) return "THEMES: None\nSUMMARY: No active discussions.\nVELOCITY: Stable";
        if (cachedPulse != null && lastPulseUpdate != null &&
            Instant.now().isBefore(lastPulseUpdate.plusSeconds(CACHE_TTL_SECONDS))) {
            return cachedPulse;
        }
        String aggregated = contentSnippets.stream().limit(15).collect(Collectors.joining("\n---\n"));
        String prompt = "Analyze these Alzheimer's support platform interactions:\n" + aggregated + "\n\n"
                + "Provide a response in this EXACT format:\n"
                + "THEMES: Theme 1, Theme 2, Theme 3\nSUMMARY: Your clinical insight.\nVELOCITY: [Improving/Stable/Degrading]";
        String result = callGemini(prompt);
        if (result != null && !result.startsWith("AI Service")) {
            this.cachedPulse = result;
            this.lastPulseUpdate = Instant.now();
        }
        return result;
    }
}
