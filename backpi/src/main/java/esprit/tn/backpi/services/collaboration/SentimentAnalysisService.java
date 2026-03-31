package esprit.tn.backpi.services.collaboration;

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

        System.out.println("SENTIMENT ANALYSIS [Start]: Analyzing content -> '" + content + "'");

        try {
            // Try Hugging Face AI First
            Double score = getAiSentimentScore(content);
            System.out.println("SENTIMENT ANALYSIS [AI Result]: Score = " + score);
            return score;
        } catch (Exception e) {
            System.err.println("SENTIMENT ANALYSIS [AI Failed]: Error = " + e.getMessage() + ". Falling back to keyword matching.");
            Double score = calculateKeywordScore(content);
            System.out.println("SENTIMENT ANALYSIS [Keyword Fallback Result]: Score = " + score);
            return score;
        }
    }

    private Double getAiSentimentScore(String content) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + apiToken);

        Map<String, String> body = Map.of("inputs", content);
        HttpEntity<Map<String, String>> entity = new HttpEntity<>(body, headers);

        // Hugging Face returns an array of arrays of results: [[{"label": "positive", "score": 0.9}, ...]]
        List<List<Map<String, Object>>> response = restTemplate.postForObject(apiUrl, entity, List.class);

        if (response != null && !response.isEmpty() && !response.get(0).isEmpty()) {
            double finalScore = 0.0;
            System.out.println("AI Response Details:");
            for (Map<String, Object> result : response.get(0)) {
                String label = (String) result.get("label");
                double scoreValue = ((Number) result.get("score")).doubleValue();
                System.out.println("  - Label: " + label + ", Score: " + scoreValue);

                // CardiffNLP model uses labels: 'positive', 'neutral', 'negative'
                if ("positive".equalsIgnoreCase(label)) {
                    finalScore += scoreValue;
                } else if ("negative".equalsIgnoreCase(label)) {
                    finalScore -= scoreValue;
                }
            }
            return Math.max(-1.0, Math.min(1.0, finalScore));
        }
        throw new RuntimeException("Invalid response from Hugging Face");
    }

    private Double calculateKeywordScore(String content) {
        String lowerContent = content.toLowerCase();
        double score = 0.0;
        
        // Simple negation check
        List<String> negations = Arrays.asList("not", "no", "never", "pas", "ne pas", "ne");
        boolean isNegated = false;
        for (String neg : negations) {
            if (lowerContent.contains(neg + " ")) {
                isNegated = true;
                break;
            }
        }

        for (String word : NEGATIVE_KEYWORDS) {
            if (lowerContent.contains(word)) {
                // If negated, it's not actually negative (e.g., "not sad")
                if (!isNegated) {
                    score -= 0.5;
                } else {
                    score += 0.2; // Small boost for positive negation
                }
            }
        }
        for (String word : POSITIVE_KEYWORDS) {
            if (lowerContent.contains(word)) {
                if (!isNegated) {
                    score += 0.5;
                } else {
                    score -= 0.2; // Small penalty for negative negation (e.g., "not happy")
                }
            }
        }
        return Math.max(-1.0, Math.min(1.0, score));
    }

    public boolean isWorryingContent(String content) {
        Double score = calculateSentimentScore(content);
        boolean isWorrying = score <= -0.5;
        if (isWorrying) {
            System.out.println("SENTIMENT ANALYSIS [Alert]: Content classified as WORRYING (Score: " + score + ")");
        }
        return isWorrying;
    }
}
