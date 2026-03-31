package esprit.tn.backpi.services.collaboration;

import esprit.tn.backpi.dto.collaboration.MessageCreateDto;
import esprit.tn.backpi.dto.collaboration.MessageResponseDto;
import esprit.tn.backpi.entities.User;
import esprit.tn.backpi.entities.collaboration.ChatGroup;
import esprit.tn.backpi.entities.collaboration.Message;
import esprit.tn.backpi.repositories.UserRepository;
import esprit.tn.backpi.repositories.collaboration.ChatGroupRepository;
import esprit.tn.backpi.repositories.collaboration.MessageRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final SentimentAnalysisService sentimentAnalysisService;
    private final CareBotService careBotService;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final ChatGroupRepository chatGroupRepository;

    public MessageService(MessageRepository messageRepository,
                          SimpMessagingTemplate messagingTemplate,
                          SentimentAnalysisService sentimentAnalysisService,
                          CareBotService careBotService,
                          NotificationService notificationService,
                          UserRepository userRepository,
                          ChatGroupRepository chatGroupRepository) {
        this.messageRepository = messageRepository;
        this.messagingTemplate = messagingTemplate;
        this.sentimentAnalysisService = sentimentAnalysisService;
        this.careBotService = careBotService;
        this.notificationService = notificationService;
        this.userRepository = userRepository;
        this.chatGroupRepository = chatGroupRepository;
    }

    public List<MessageResponseDto> getAllMessages() {
        return messageRepository.findAll().stream()
                .map(this::mapToResponseDto)
                .collect(Collectors.toList());
    }

    public List<MessageResponseDto> getMessagesByGroup(Long groupId) {
        List<Message> msgs = messageRepository.findByChatGroupId(groupId);
        return msgs.stream()
                .map(this::mapToResponseDto)
                .collect(Collectors.toList());
    }

    public MessageResponseDto getMessageById(Long id) {
        return messageRepository.findById(id)
                .map(this::mapToResponseDto)
                .orElse(null);
    }

    public MessageResponseDto createMessage(MessageCreateDto dto, String mediaUrl, String mimeType) {
        User sender = userRepository.findById(dto.getSenderId())
                .orElseThrow(() -> new RuntimeException("Sender not found: " + dto.getSenderId()));
                
        ChatGroup group = null;
        if (dto.getChatGroupId() != null) {
            group = chatGroupRepository.findById(dto.getChatGroupId())
                    .orElseThrow(() -> new RuntimeException("ChatGroup not found: " + dto.getChatGroupId()));
        }

        User receiver = null;
        if (dto.getReceiverId() != null) {
            receiver = userRepository.findById(dto.getReceiverId())
                    .orElseThrow(() -> new RuntimeException("Receiver not found: " + dto.getReceiverId()));
        }

        Message message = new Message();
        message.setContent(dto.getContent());
        message.setSender(sender);
        message.setChatGroup(group);
        message.setReceiver(receiver);
        message.setSentAt(Instant.now());
        message.setMediaUrl(mediaUrl);
        message.setMimeType(mimeType);
 
        if (dto.getParentMessageId() != null) {
            Message parent = messageRepository.findById(dto.getParentMessageId())
                    .orElseThrow(() -> new RuntimeException("Parent message not found: " + dto.getParentMessageId()));
            message.setParentMessage(parent);
        }

        Double score = sentimentAnalysisService.calculateSentimentScore(message.getContent());
        message.setSentimentScore(score);
        message.setDistressed(score <= -0.5);

        Message savedObj = messageRepository.save(message);
        MessageResponseDto responseDto = mapToResponseDto(savedObj);

        // Broadcast to group WebSocket topic
        if (savedObj.getChatGroup() != null) {
            messagingTemplate.convertAndSend("/topic/group/" + savedObj.getChatGroup().getId(), responseDto);

            // Notify every group member except the sender
            String groupName = savedObj.getChatGroup().getName();
            String senderLabel = "User " + sender.getId();

            if (savedObj.getChatGroup().getMembers() != null) {
                for (User member : savedObj.getChatGroup().getMembers()) {
                    if (member.getId() != null && !member.getId().equals(sender.getId())) {
                        notificationService.createAndSend(
                            member.getId(),
                            senderLabel + " sent a message in \"" + groupName + "\"",
                            "GROUP_MESSAGE"
                        );
                    }
                }
            }
        } else if (savedObj.getReceiver() != null) {
            // Private Message Broadcasting
            messagingTemplate.convertAndSendToUser(savedObj.getReceiver().getId().toString(), "/queue/direct", responseDto);
            messagingTemplate.convertAndSendToUser(savedObj.getSender().getId().toString(), "/queue/direct", responseDto);
            
            // Notify Receiver
            notificationService.createAndSend(
                savedObj.getReceiver().getId(),
                "New private message from User " + sender.getId(),
                "PRIVATE_MESSAGE"
            );
        }

        // Trigger CareBot logic if necessary
        careBotService.processMessageForSupport(savedObj);

        return responseDto;
    }

    public MessageResponseDto updateMessage(Long id, MessageCreateDto dto, String mediaUrl, String mimeType) {
        return messageRepository.findById(id).map(existingMessage -> {
            existingMessage.setContent(dto.getContent());
            if (mediaUrl != null) {
                existingMessage.setMediaUrl(mediaUrl);
                existingMessage.setMimeType(mimeType);
            }
            Message saved = messageRepository.save(existingMessage);
            MessageResponseDto responseDto = mapToResponseDto(saved);

            // Notify via WebSocket about the update
            if (saved.getChatGroup() != null) {
                messagingTemplate.convertAndSend("/topic/group/" + saved.getChatGroup().getId(), responseDto);
            } else if (saved.getReceiver() != null) {
                messagingTemplate.convertAndSendToUser(saved.getReceiver().getId().toString(), "/queue/direct", responseDto);
                messagingTemplate.convertAndSendToUser(saved.getSender().getId().toString(), "/queue/direct", responseDto);
            }

            return responseDto;
        }).orElse(null);
    }

    public void deleteMessage(Long id) {
        messageRepository.findById(id).ifPresent(message -> {
            messageRepository.delete(message);
            
            // Send a special "delete" notification via WebSocket
            MessageResponseDto deleteNotice = new MessageResponseDto();
            deleteNotice.setId(id);
            deleteNotice.setContent("__DELETED__"); // Special marker

            if (message.getChatGroup() != null) {
                messagingTemplate.convertAndSend("/topic/group/" + message.getChatGroup().getId(), deleteNotice);
            } else if (message.getReceiver() != null) {
                messagingTemplate.convertAndSendToUser(message.getReceiver().getId().toString(), "/queue/direct", deleteNotice);
                messagingTemplate.convertAndSendToUser(message.getSender().getId().toString(), "/queue/direct", deleteNotice);
            }
        });
    }

    private MessageResponseDto mapToResponseDto(Message message) {
        MessageResponseDto dto = new MessageResponseDto();
        dto.setId(message.getId());
        dto.setContent(message.getContent());
        dto.setMediaUrl(message.getMediaUrl());
        dto.setMimeType(message.getMimeType());
        dto.setSentAt(message.getSentAt());
        dto.setDistressed(message.isDistressed());
        dto.setSentimentScore(message.getSentimentScore());

        if (message.getSender() != null) {
            dto.setSenderId(message.getSender().getId());
            dto.setSenderName(message.getSender().getName());
        }

        if (message.getReceiver() != null) {
            dto.setReceiverId(message.getReceiver().getId());
        }

        if (message.getChatGroup() != null) {
            dto.setChatGroupId(message.getChatGroup().getId());
        }
 
        if (message.getParentMessage() != null) {
            dto.setParentMessageId(message.getParentMessage().getId());
            dto.setParentMessageContent(message.getParentMessage().getContent());
            if (message.getParentMessage().getSender() != null) {
                dto.setParentMessageSenderName(message.getParentMessage().getSender().getName());
            }
        }

        return dto;
    }
}
