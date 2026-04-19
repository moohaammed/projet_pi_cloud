package esprit.tn.collab.services.collaboration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Service
public class SentimentAnalysisService {

    @Value("${huggingface.api.url}")
    private String apiUrl;

    @Value("${huggingface.api.token}")
    private String apiToken;

    private final RestTemplate restTemplate = new RestTemplate();

    private static final List<String> NEGATIVE_KEYWORDS = Arrays.asList(
        "perdu", "perdue", "oublié", "oubliée", "mal", "douleur", "peur", "inquiétude", "stress", "mort", "suicide", "triste", "seul",
        "lost", "forgot", "pain", "scared", "worried", "anxious", "where", "comment", "help", "aide", "died", "alone", "sad"
    );

    private static final List<String> POSITIVE_KEYWORDS = Arrays.asList(
        "content", "heureux", "joie", "bien", "merci", "bravo", "aimé", "super", "cool",
        "happy", "joy", "good", "thanks", "great", "love", "smile", "better"
    );

    public Double calculateSentimentScore(String content) {
        if (content == null || content.isEmpty()) return 0.0;
        try {
            return getAiSentimentScore(content);
        } catch (Exception e) {
            return calculateKeywordScore(content);
        }
    }

    @SuppressWarnings("unchecked")
    private Double getAiSentimentScore(String content) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + apiToken);
        Map<String, String> body = Map.of("inputs", content);
        HttpEntity<Map<String, String>> entity = new HttpEntity<>(body, headers);
        List<List<Map<String, Object>>> response = restTemplate.postForObject(apiUrl, entity, List.class);
        if (response != null && !response.isEmpty() && !response.get(0).isEmpty()) {
            double finalScore = 0.0;
            for (Map<String, Object> result : response.get(0)) {
                String label = (String) result.get("label");
                double scoreValue = ((Number) result.get("score")).doubleValue();
                if ("positive".equalsIgnoreCase(label)) finalScore += scoreValue;
                else if ("negative".equalsIgnoreCase(label)) finalScore -= scoreValue;
            }
            return Math.max(-1.0, Math.min(1.0, finalScore));
        }
        throw new RuntimeException("Invalid response from Hugging Face");
    }

    private Double calculateKeywordScore(String content) {
        String lowerContent = content.toLowerCase();
        double score = 0.0;
        boolean isNegated = List.of("not", "no", "never", "pas", "ne pas", "ne")
                .stream().anyMatch(neg -> lowerContent.contains(neg + " "));
        for (String word : NEGATIVE_KEYWORDS) {
            if (lowerContent.contains(word)) score += isNegated ? 0.2 : -0.5;
        }
        for (String word : POSITIVE_KEYWORDS) {
            if (lowerContent.contains(word)) score += isNegated ? -0.2 : 0.5;
        }
        return Math.max(-1.0, Math.min(1.0, score));
    }

    public boolean isWorryingContent(String content) {
        return calculateSentimentScore(content) <= -0.5;
    }
}
