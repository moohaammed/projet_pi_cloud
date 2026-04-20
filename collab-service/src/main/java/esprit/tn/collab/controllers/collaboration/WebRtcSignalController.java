package esprit.tn.collab.controllers.collaboration;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
public class WebRtcSignalController {

    private final SimpMessagingTemplate messagingTemplate;

    public WebRtcSignalController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    
    @MessageMapping("/webrtc.signal")
    public void relaySignal(@Payload Map<String, Object> signal) {
        Object targetIdObj = signal.get("targetId");
        if (targetIdObj == null) {
            System.err.println("[WebRTC] Signal missing targetId, dropping: " + signal);
            return;
        }
        String targetId = String.valueOf(((Number) targetIdObj).longValue());
        System.out.println("[WebRTC] Relaying signal type=" + signal.get("type")
                + " from=" + signal.get("senderId") + " to=" + targetId);
        messagingTemplate.convertAndSendToUser(targetId, "/queue/webrtc", signal);
    }
}
