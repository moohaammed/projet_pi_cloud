package esprit.tn.backpi.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
public class WebRtcController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/webrtc.signal")
    public void signal(@Payload Map<String, Object> payload) {
        String targetId = String.valueOf(payload.get("targetId"));
        String senderId = String.valueOf(payload.get("senderId"));
        String type = String.valueOf(payload.get("type"));
        
        System.out.println("====== STOMP WEBRTC SIGNAL RECEIVED ======");
        System.out.println("Type: " + type + " | Sender: " + senderId + " -> Target: " + targetId);
        System.out.println("Relaying to /user/" + targetId + "/queue/webrtc");
        System.out.println("==========================================");
        
        // Forward the exact payload to the target user's queue
        messagingTemplate.convertAndSendToUser(targetId, "/queue/webrtc", payload);
    }
}
