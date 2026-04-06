package esprit.tn.backpi.controller;

import esprit.tn.backpi.dto.SignalMessage;
import esprit.tn.backpi.entities.collaboration.ChatGroup;
import esprit.tn.backpi.entity.User;
import esprit.tn.backpi.repositories.collaboration.ChatGroupRepository;
import esprit.tn.backpi.services.collaboration.NotificationService;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;
import java.util.Optional;

@Controller
public class SignalingController {

    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;
    private final ChatGroupRepository chatGroupRepository;

    public SignalingController(SimpMessagingTemplate messagingTemplate, 
                               NotificationService notificationService,
                               ChatGroupRepository chatGroupRepository) {
        this.messagingTemplate = messagingTemplate;
        this.notificationService = notificationService;
        this.chatGroupRepository = chatGroupRepository;
    }

    /**
     * DM video ring: deliver invite only to callee's user queue so they see it even without that chat open.
     * All other signals (join, offer, …) go to the room topic only.
     */
    @MessageMapping("/call/{roomId}")
    public void handleSignaling(@DestinationVariable String roomId, @Payload SignalMessage message) {
        if (message == null) {
            return;
        }
        System.out.println("DEBUG [SignalingController]: Processing signal type=" + message.getType() + 
                           " for room=" + roomId + 
                           " senderId=" + message.getSenderId() + 
                           " recipientId=" + message.getRecipientId() +
                           " data=" + message.getData());

        boolean isMessengerInvite = "messenger-invite".equals(message.getType());
        boolean isRendezvousInvite = "rendezvous-invite".equals(message.getType());

        if (isMessengerInvite || isRendezvousInvite) {
            System.out.println("DEBUG [SignalingController]: message.getData() class=" + (message.getData() != null ? message.getData().getClass().getName() : "null"));
            String callerName = "Someone";
            if (message.getData() instanceof Map) {
                Map<?, ?> dataMap = (Map<?, ?>) message.getData();
                if (dataMap.containsKey("callerName")) {
                    callerName = String.valueOf(dataMap.get("callerName"));
                }
            }

            // 1. Direct Message or Rendezvous Invite (Targeted)
            if (message.getRecipientId() != null && !message.getRecipientId().isBlank()) {
                String recipientIdStr = message.getRecipientId().trim();
                
                // Create a clean targeted message
                SignalMessage targetedMessage = SignalMessage.builder()
                    .type(message.getType())
                    .senderId(message.getSenderId())
                    .recipientId(recipientIdStr)
                    .data(message.getData())
                    .build();

                System.out.println("DEBUG [SignalingController]: Sending targeted signal to /user/" + recipientIdStr + "/queue/videocall");
                
                messagingTemplate.convertAndSendToUser(
                        recipientIdStr,
                        "/queue/videocall",
                        targetedMessage
                );
                
                // Also broadcast to the room topic as a backup
                System.out.println("DEBUG [SignalingController]: Broadcasting invite to /topic/call/" + roomId);
                messagingTemplate.convertAndSend("/topic/call/" + roomId, targetedMessage);
                
                // Persistent notification
                try {
                    Long recipientIdNum = Long.parseLong(recipientIdStr);
                    String notificationMessage = isRendezvousInvite 
                        ? "Incoming video call from " + callerName + " for your appointment"
                        : "Incoming call from " + callerName;
                    
                    notificationService.createAndSend(
                        recipientIdNum,
                        notificationMessage,
                        "VIDEO_CALL_INVITE"
                    );
                } catch (Exception e) {
                    System.err.println("Error sending persistent notification: " + e.getMessage());
                }
                return;
            }
            
            // 2. Group Invite (Messenger Only)
            if (isMessengerInvite && roomId.startsWith("collab-group-")) {
                try {
                    Long groupId = Long.parseLong(roomId.replace("collab-group-", ""));
                    Optional<ChatGroup> groupOpt = chatGroupRepository.findById(groupId);
                    if (groupOpt.isPresent()) {
                        ChatGroup group = groupOpt.get();
                        String senderId = message.getSenderId();
                        
                        if (group.getMembers() != null) {
                            for (User member : group.getMembers()) {
                                // Don't notify the person who started the call
                                if (member.getId() != null && !String.valueOf(member.getId()).equals(senderId)) {
                                    // Set recipientId so the frontend knows this message was specifically targeted
                                    SignalMessage targetedMessage = SignalMessage.builder()
                                        .type(message.getType())
                                        .senderId(message.getSenderId())
                                        .recipientId(String.valueOf(member.getId()))
                                        .data(message.getData())
                                        .build();

                                    // 1. Send the signal directly to their private queue so the "Accept/Decline" bar appears
                                    messagingTemplate.convertAndSendToUser(
                                        String.valueOf(member.getId()),
                                        "/queue/videocall",
                                        targetedMessage
                                    );

                                    // 2. Also send a persistent notification
                                    notificationService.createAndSend(
                                        member.getId(),
                                        "Call started in group \"" + group.getName() + "\" by " + callerName,
                                        "VIDEO_CALL_INVITE"
                                    );
                                }
                            }
                        }
                    }
                } catch (Exception e) {
                    System.err.println("Error notifying group members for call: " + e.getMessage());
                }
            }

            messagingTemplate.convertAndSend("/topic/call/" + roomId, message);
            return;
        }

        messagingTemplate.convertAndSend("/topic/call/" + roomId, message);
    }
}
