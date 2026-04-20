package esprit.tn.backpi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import esprit.tn.backpi.dto.AnalysisRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class OpenRouterService {

    @Value("${openrouter.api.key}")
    private String apiKey;

    @Value("${openrouter.api.url}")
    private String apiUrl;

    @Value("${openrouter.model}")
    private String model;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public String analyze(AnalysisRequest request) throws Exception {
        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Map<String, Object> body = new HashMap<>();
        body.put("model", model);

        List<Map<String, String>> messages = new ArrayList<>();

        Map<String, String> systemMessage = new HashMap<>();
        systemMessage.put("role", "system");
        systemMessage.put("content", request.getSystemPrompt());

        Map<String, String> userMessage = new HashMap<>();
        userMessage.put("role", "user");
        userMessage.put("content", request.getTranscript());

        messages.add(systemMessage);
        messages.add(userMessage);

        body.put("messages", messages);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        ResponseEntity<String> response = restTemplate.exchange(
                apiUrl,
                HttpMethod.POST,
                entity,
                String.class

        );

        String responseBody = response.getBody();

        JsonNode jsonNode = objectMapper.readTree(responseBody);
        JsonNode contentNode = jsonNode.path("choices").get(0).path("message").path("content");

        String text = contentNode.asText();

// extraire uniquement le JSON
        int start = text.indexOf("{");
        int end = text.lastIndexOf("}");

        if (start != -1 && end != -1) {
            text = text.substring(start, end + 1);
        }

        return text;
    }
}
