package esprit.tn.backpi.services.collaboration;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Minimal notification sender used by SignalingController in backpi.
 * Full notification logic lives in collab-service.
 */
@Service
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    public NotificationService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void createAndSend(Long userId, String content, String type) {
        messagingTemplate.convertAndSendToUser(
            userId.toString(),
            "/queue/notifications",
            Map.of("content", content, "type", type, "userId", userId)
        );
    }
}
