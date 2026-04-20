package esprit.tn.collab.controllers.collaboration;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
public class TypingController {

    private final SimpMessagingTemplate messagingTemplate;

    public TypingController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/typing")
    public void relayTyping(@Payload Map<String, Object> payload) {
        Object targetIdObj = payload.get("targetId");
        Object groupIdObj = payload.get("groupId");

        if (groupIdObj != null) {
            // Group typing indicator — broadcast to all group members
            messagingTemplate.convertAndSend("/topic/group/" + groupIdObj + "/typing", payload);
        } else if (targetIdObj != null) {
            // DM typing indicator — send to specific user
            String targetId = String.valueOf(((Number) targetIdObj).longValue());
            messagingTemplate.convertAndSendToUser(targetId, "/queue/typing", payload);
        }
    }
}
