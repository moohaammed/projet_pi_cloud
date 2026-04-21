package esprit.tn.collab.services.collaboration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class VoiceAssistantService {

    
    private static final String SYSTEM_PROMPT =
        "You are the Brain — a warm, smart assistant built into a care app for people living with Alzheimer's disease. " +
        "You help the user navigate the app and connect with their loved ones. " +
        "\n\nYou work in two modes:\n" +
        "MODE A (screen description): contextType is button / post / message / notification / group / person / page / input. " +
        "Explain what is on screen in ONE warm sentence (max 20 words). Do NOT call any tools. " +
        "\nMODE B (intent / conversation): contextType is intent or conversation. " +
        "Understand what the user truly wants — even from emotional phrasing — and act immediately. " +
        "If a tool is appropriate, output it BEFORE the spoken sentence separated by a pipe: MapsTo(\"messages\")|I am taking you to your messages now. " +
        "If no tool fits, respond with just the spoken sentence. " +
        "\n\nAvailable tools: MapsTo(\"messages\"), MapsTo(\"home\"), MapsTo(\"profile\"), " +
        "MapsTo(\"doctor_list\"), MapsTo(\"groups\"), MapsTo(\"notifications\"), " +
        "sendMessage(\"ContactName\", \"message text\"), getAppContext(). " +
        "\n\nRules (apply always): " +
        "1. ONE sentence maximum 20 words for the spoken part. " +
        "2. No technical words. No 'interface', 'module', 'redirecting', 'navigation'. " +
        "3. Be warm, patient, and reassuring — the person may be confused or scared. " +
        "4. Act immediately on clear intent; do not ask for permission. " +
        "5. If the user says 'I miss someone', offer to open messages or send a message for them. " +
        "6. If the user sounds distressed ('I am lost', 'I don't know where I am'), " +
        "   call getAppContext() to understand the screen, then reassure: getAppContext()|You are safe, and I am right here with you. " +
        "7. Output ONLY the tool call + pipe + sentence, or just the sentence. No extra text.";

    @Value("${spring.ai.google.gemini.api-key:}")
    private String apiKey;

    @Value("${spring.ai.google.gemini.model-id:gemini-1.5-flash}")
    private String modelId;

    private final RestTemplate restTemplate = new RestTemplate();

    
    public String generateGuidance(String contextType, String contextData, String pageName) {
        if (apiKey == null || apiKey.isBlank()) {
            return buildFallback(contextType, contextData);
        }

        String userPrompt = buildUserPrompt(contextType, contextData, pageName);

        String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                + modelId + ":generateContent?key=" + apiKey;

        HttpHeaders headers = new HttpHeaders();
        headers.set("Content-Type", "application/json");

        Map<String, Object> systemInstruction = new HashMap<>();
        systemInstruction.put("parts", List.of(Map.of("text", SYSTEM_PROMPT)));

        Map<String, Object> userContent = new HashMap<>();
        userContent.put("role", "user");
        userContent.put("parts", List.of(Map.of("text", userPrompt)));

        Map<String, Object> body = new HashMap<>();
        body.put("system_instruction", systemInstruction);
        body.put("contents", List.of(userContent));

        // Keep responses short and deterministic
        Map<String, Object> config = new HashMap<>();
        config.put("temperature", 0.4);
        config.put("maxOutputTokens", 60);
        body.put("generationConfig", config);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(url, entity, Map.class);
            return extractText(response);
        } catch (Exception e) {
            return buildFallback(contextType, contextData);
        }
    }

    @SuppressWarnings("unchecked")
    private String extractText(Map<String, Object> response) {
        if (response == null) return "I could not load the description right now.";
        try {
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            String text = ((String) parts.get(0).get("text")).trim();
            // Strip any accidental quotes the model adds
            return text.replaceAll("^[\"']|[\"']$", "");
        } catch (Exception e) {
            return "I could not load the description right now.";
        }
    }

    private String buildUserPrompt(String contextType, String contextData, String pageName) {
        return switch (contextType) {
            // ── MODE A: screen description ──────────────────────────────────────
            case "button"       -> "[MODE A] The user is on the '" + pageName + "' page and hovering over a button labeled: \"" + contextData + "\". In ONE warm sentence (max 20 words), explain what pressing it does.";
            case "post"         -> "[MODE A] The user is on the feed page looking at a post that says: \"" + truncate(contextData, 200) + "\". In ONE warm sentence, describe this post simply.";
            case "message"      -> "[MODE A] The user received a new message: \"" + truncate(contextData, 200) + "\". In ONE warm sentence, read it naturally and reassuringly.";
            case "notification" -> "[MODE A] The user received a notification: \"" + truncate(contextData, 200) + "\". In ONE warm sentence, read it as if telling a friend.";
            case "group"        -> "[MODE A] The user is hovering over a chat group called: \"" + contextData + "\". In ONE warm sentence, explain what this group is and that they can tap to open it.";
            case "person"       -> "[MODE A] The user is hovering over a contact named: \"" + contextData + "\". In ONE warm sentence, tell them they can tap to send this person a message.";
            case "page"         -> "[MODE A] The user just opened the '" + contextData + "' page. In ONE warm sentence, welcome them and explain what they can do here.";
            case "input"        -> "[MODE A] The user is hovering over a text input on the '" + pageName + "' page, described as: \"" + contextData + "\". In ONE warm sentence, explain what to type.";
            // ── MODE B: intent / conversational ─────────────────────────────────
            case "intent"       -> "[MODE B] The user said: \"" + truncate(contextData, 300) + "\". They are currently on the '" + pageName + "' page. Understand their true intent and respond with the correct tool call (if needed) + a spoken confirmation sentence.";
            case "conversation" -> "[MODE B] The user said or asked: \"" + truncate(contextData, 300) + "\". They are on the '" + pageName + "' page. Generate a warm, short follow-up question or helpful action (max 20 words). Use a tool call if the intent clearly maps to one.";
            default             -> "[MODE A] The user is looking at: \"" + truncate(contextData, 200) + "\" on the '" + pageName + "' page. In ONE warm sentence, describe it simply.";
        };
    }

    private String buildFallback(String contextType, String contextData) {
        return switch (contextType) {
            case "button"       -> "This is the " + contextData + " button. Press it to continue.";
            case "post"         -> "This is a post from the community.";
            case "message"      -> "You have a new message: " + truncate(contextData, 60) + ".";
            case "notification" -> "New notification: " + truncate(contextData, 60) + ".";
            case "group"        -> "This is the " + contextData + " group. Tap to open it.";
            case "person"       -> "This is " + contextData + ". Tap to send them a message.";
            case "page"         -> "Welcome. You are on the " + contextData + " page.";
            case "intent", "conversation" -> {
                String p = contextData != null ? contextData.toLowerCase() : "";
                
                // Messages & Messenger
                if (p.matches(".*\\b(message|messages|chat|text|inbox|contact|send)\\b.*")) {
                    yield "MapsTo(\"messages\")|Opening your messages.";
                }
                // Feed / Community (Collab main)
                else if (p.matches(".*\\b(feed|community|post|posts|share)\\b.*")) {
                    yield "MapsTo(\"feed\")|Taking you to the community feed.";
                }
                // Global Home
                else if (p.matches(".*\\b(home|front page|main)\\b.*")) {
                    yield "MapsTo(\"home\")|Taking you to the home page.";
                }
                // Groups (Collab feature)
                else if (p.matches(".*\\b(group|groups|circle|circles)\\b.*")) {
                    yield "MapsTo(\"groups\")|Taking you to your groups.";
                }
                // Doctors / Care team
                else if (p.matches(".*\\b(doctor|doc|doctors|medical|appointment)\\b.*")) {
                    yield "MapsTo(\"doctor_list\")|Taking you to your doctors.";
                }
                // Profile
                else if (p.matches(".*\\b(profile|dashboard|account|me)\\b.*")) {
                    yield "MapsTo(\"profile\")|Opening your profile.";
                }
                // Other Modules
                else if (p.matches(".*\\b(education|learn|article)\\b.*")) {
                    yield "MapsTo(\"education\")|Taking you to the education page.";
                }
                else if (p.matches(".*\\b(rendezvous|rendez-vous)\\b.*")) {
                    yield "MapsTo(\"rendezvous\")|Taking you to your appointments.";
                }
                else {
                    yield "I heard you, but I do not know how to take you there. Try saying 'messages', 'community', or 'groups'.";
                }
            }
            default -> truncate(contextData, 60);
        };
    }

    private String truncate(String text, int max) {
        if (text == null) return "";
        return text.length() <= max ? text : text.substring(0, max) + "...";
    }
}
