package esprit.tn.backpi.controller;

import esprit.tn.backpi.dto.SignalMessage;
import esprit.tn.backpi.services.collaboration.NotificationService;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
public class SignalingController {

    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;

    public SignalingController(SimpMessagingTemplate messagingTemplate,
                               NotificationService notificationService) {
        this.messagingTemplate = messagingTemplate;
        this.notificationService = notificationService;
    }

    @MessageMapping("/call/{roomId}")
    public void handleSignaling(@DestinationVariable String roomId, @Payload SignalMessage message) {
        if (message == null) return;

        boolean isInvite = "messenger-invite".equals(message.getType()) || "rendezvous-invite".equals(message.getType());

        if (isInvite) {
            String callerName = "Someone";
            if (message.getData() instanceof Map) {
                Object cn = ((Map<?, ?>) message.getData()).get("callerName");
                if (cn != null) callerName = String.valueOf(cn);
            }

            // Targeted (DM or rendezvous)
            if (message.getRecipientId() != null && !message.getRecipientId().isBlank()) {
                String recipientId = message.getRecipientId().trim();
                SignalMessage targeted = SignalMessage.builder()
                    .type(message.getType())
                    .senderId(message.getSenderId())
                    .recipientId(recipientId)
                    .data(message.getData())
                    .build();

                messagingTemplate.convertAndSendToUser(recipientId, "/queue/videocall", targeted);
                messagingTemplate.convertAndSend("/topic/call/" + roomId, targeted);

                try {
                    notificationService.createAndSend(Long.parseLong(recipientId),
                        "Incoming call from " + callerName, "VIDEO_CALL_INVITE");
                } catch (Exception ignored) {}
                return;
            }
        }

        // Broadcast to room (group calls, offers, answers, ICE candidates)
        messagingTemplate.convertAndSend("/topic/call/" + roomId, message);
    }
}
