package esprit.tn.donation.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
public class OllamaService {

    @Autowired
    private RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public String generateDonationSummary(String campaignTitle, String campaignDescription, Integer amount) {
        String url = "http://localhost:11434/api/generate";

        String prompt = """
                Tu es un assistant pour une plateforme de dons dédiée à Alzheimer.
                Génère un message court, clair, humain, professionnel et transparent.
                N'invente pas des chiffres précis ni des promesses fausses.
                
                Données :
                - Campagne : %s
                - Description : %s
                - Montant du don : %s TND
                
                Réponds en français en 1 ou 2 phrases maximum.
                """.formatted(campaignTitle, campaignDescription, amount);

        Map<String, Object> body = new HashMap<>();
        body.put("model", "llama3");
        body.put("prompt", prompt);
        body.put("stream", false);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

        try {
            JsonNode jsonNode = objectMapper.readTree(response.getBody());
            return jsonNode.get("response").asText().trim();
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la lecture de la réponse Ollama", e);
        }
    }
}