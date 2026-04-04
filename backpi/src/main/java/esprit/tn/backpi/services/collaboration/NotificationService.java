package esprit.tn.backpi.services.collaboration;

import esprit.tn.backpi.dto.collaboration.NotificationResponseDto;
import esprit.tn.backpi.entities.collaboration.Notification;
import esprit.tn.backpi.repositories.collaboration.NotificationRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public NotificationService(NotificationRepository notificationRepository,
                               SimpMessagingTemplate messagingTemplate) {
        this.notificationRepository = notificationRepository;
        this.messagingTemplate = messagingTemplate;
    }

    public NotificationResponseDto createAndSend(Long userId, String content, String type) {
        Notification notification = new Notification(userId, content, type);
        Notification saved = notificationRepository.save(notification);
 
        NotificationResponseDto dto = mapToResponseDto(saved);
 
        // Broadcast via WebSocket
        messagingTemplate.convertAndSend("/topic/notifications/" + userId, dto);
 
        System.out.println("DEBUG [NotificationService]: Sent " + type + " to User " + userId);
        return dto;
    }
 
    public List<NotificationResponseDto> getNotificationsForUser(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::mapToResponseDto)
                .collect(java.util.stream.Collectors.toList());
    }
 
    public void markAsRead(Long id) {
        notificationRepository.findById(id).ifPresent(n -> {
            n.setRead(true);
            notificationRepository.save(n);
        });
    }
 
    public void deleteNotification(Long id) {
        notificationRepository.deleteById(id);
    }
 
    private NotificationResponseDto mapToResponseDto(Notification n) {
        NotificationResponseDto dto = new NotificationResponseDto();
        dto.setId(n.getId());
        dto.setUserId(n.getUserId());
        dto.setContent(n.getContent());
        dto.setType(n.getType());
        dto.setIsRead(n.isRead());
        dto.setCreatedAt(n.getCreatedAt());
        return dto;
    }
}
