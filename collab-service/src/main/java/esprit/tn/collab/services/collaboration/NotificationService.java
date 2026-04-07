package esprit.tn.collab.services.collaboration;

import esprit.tn.collab.dto.collaboration.NotificationResponseDto;
import esprit.tn.collab.entities.collaboration.Notification;
import esprit.tn.collab.repositories.collaboration.NotificationRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

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
        messagingTemplate.convertAndSendToUser(userId.toString(), "/queue/notifications", dto);
        return dto;
    }

    public List<NotificationResponseDto> getNotificationsForUser(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::mapToResponseDto)
                .collect(Collectors.toList());
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
