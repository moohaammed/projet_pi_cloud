package esprit.tn.backpi.services;

import org.springframework.stereotype.Service;
import java.util.Arrays;
import java.util.List;

@Service
public class SentimentAnalysisService {

    // Simple keyword-based detection for "worrying" signs in Alzheimer's patients
    private static final List<String> WORRY_KEYWORDS = Arrays.asList(
        "perdu", "perdue", "oublié", "oubliée", "mal", "douleur", "peur", "inquiétude", "stress", "mort", "suicide", "triste", "seul",
        "lost", "forgot", "pain", "scared", "worried", "anxious", "where", "comment", "help", "aide", "died", "alone", "sad"
    );

    /**
     * Scans text for worrying keywords.
     * Returns true if any keyword is found (case-insensitive).
     */
    public boolean isWorryingContent(String content) {
        if (content == null || content.isEmpty()) {
            return false;
        }
        
        String lowerContent = content.toLowerCase();
        boolean found = WORRY_KEYWORDS.stream().anyMatch(lowerContent::contains);
        if (found) {
            System.out.println("DEBUG [Sentiment]: Worrying keyword found in: \"" + content + "\"");
        }
        return found;
    }
}
