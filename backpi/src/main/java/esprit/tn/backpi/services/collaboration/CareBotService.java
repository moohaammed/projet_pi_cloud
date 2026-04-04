package esprit.tn.backpi.services.collaboration;

import esprit.tn.backpi.dto.collaboration.MessageResponseDto;
import esprit.tn.backpi.entities.collaboration.Message;
import esprit.tn.backpi.entity.User;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import java.time.Instant;

@Service
public class CareBotService {

    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;

    public CareBotService(SimpMessagingTemplate messagingTemplate,
                          NotificationService notificationService) {
        this.messagingTemplate = messagingTemplate;
        this.notificationService = notificationService;
    }

    public void processMessageForSupport(Message userMsg) {
        if (userMsg.getSentimentScore() != null && userMsg.getSentimentScore() <= -0.5) {
            sendReassurance(userMsg.getSender());
        }
    }

    public void sendReassurance(User targetUser) {
        if (targetUser == null || targetUser.getId() == null) return;

        MessageResponseDto botDto = new MessageResponseDto();
        botDto.setId(0L);
        botDto.setContent("Hello! I'm CareBot. I noticed you might be going through a tough moment. Remember that you're not alone and we're here to support you! ❤️");
        botDto.setSentAt(Instant.now());
        botDto.setSenderId(0L);
        botDto.setSenderName("CareBot");
        botDto.setReceiverId(targetUser.getId());

        System.out.println("CARE-BOT [Action]: Sending reassurance to User " + targetUser.getId());

        messagingTemplate.convertAndSendToUser(
            targetUser.getId().toString(),
            "/queue/carebot",
            botDto
        );

        notificationService.createAndSend(
            targetUser.getId(),
            "CareBot: I've noticed you might be feeling down. I'm here for you.",
            "CAREBOT"
        );
    }
}
