package esprit.tn.backpi.services.collaboration;

import esprit.tn.backpi.entities.collaboration.Message;
import esprit.tn.backpi.repositories.collaboration.MessageRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

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

    public HandoverService(MessageRepository messageRepository) {
        this.messageRepository = messageRepository;
        this.restTemplate = new RestTemplate();
    }

    public String generateHandoverSummary(Long groupId) {
        List<Message> messages = messageRepository.findByChatGroupIdOrderBySentAtDesc(groupId);
        int limit = Math.min(messages.size(), 30);
        List<Message> recentMessages = messages.subList(0, limit);

        if (recentMessages.isEmpty()) {
            return "No recent messages to summarize.";
        }

        String messagesText = recentMessages.stream()
                .map(msg -> {
                    String senderName = msg.getSender() != null
                            ? msg.getSender().getPrenom() + " " + msg.getSender().getNom()
                            : "System/Bot";
                    return senderName + ": " + msg.getContent();
                })
                .collect(Collectors.joining("\n"));

        String promptText = "Summarize these caregiver messages into 3 bullet points focusing on: "
                + "1. Patient Mood, 2. Meds/Food, 3. Urgent Actions. Be concise. \n\nMessages:\n"
                + messagesText;

        return callGemini(promptText);
    }

    private String callGemini(String prompt) {
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
                    Map<String, Object> firstCandidate = candidates.get(0);
                    Map<String, Object> contentMap = (Map<String, Object>) firstCandidate.get("content");
                    List<Map<String, Object>> parts = (List<Map<String, Object>>) contentMap.get("parts");
                    return (String) parts.get(0).get("text");
                }
            }
            return "AI failed to generate a response format correctly.";
        } catch (Exception e) {
            e.printStackTrace();
            return "Error calling Gemini API: " + e.getMessage();
        }
    }
}
