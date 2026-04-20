package esprit.tn.collab.controllers.collaboration;

import esprit.tn.collab.services.collaboration.VoiceAssistantService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/voice-assistant")
@CrossOrigin(origins = "http://localhost:4200")
public class VoiceAssistantController {

    private final VoiceAssistantService voiceAssistantService;

    public VoiceAssistantController(VoiceAssistantService voiceAssistantService) {
        this.voiceAssistantService = voiceAssistantService;
    }

    
    @PostMapping("/describe")
    public ResponseEntity<Map<String, String>> describe(@RequestBody Map<String, String> body) {
        String contextType = body.getOrDefault("contextType", "button");
        String contextData = body.getOrDefault("contextData", "");
        String pageName    = body.getOrDefault("pageName", "app");

        String raw = voiceAssistantService.generateGuidance(contextType, contextData, pageName);

        Map<String, String> result = new HashMap<>();

        // Parse the pipe-delimited agentic response: "ToolCall(args)|Spoken sentence"
        int pipeIdx = raw.indexOf('|');
        if (pipeIdx != -1) {
            String toolCall = raw.substring(0, pipeIdx).trim();
            String spoken   = raw.substring(pipeIdx + 1).trim();
            result.put("text",   spoken.isEmpty() ? raw : spoken);
            result.put("action", toolCall);
            // Extract just the tool name for easy switch-casing on the client
            Matcher m = Pattern.compile("^([A-Za-z]+)").matcher(toolCall);
            if (m.find()) result.put("tool", m.group(1));
        } else {
            // Plain screen-description response — no tool call
            result.put("text", raw);
        }

        return ResponseEntity.ok(result);
    }
}
