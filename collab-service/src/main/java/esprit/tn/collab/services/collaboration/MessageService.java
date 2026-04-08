package esprit.tn.collab.services.collaboration;

import esprit.tn.collab.clients.UserClient;
import esprit.tn.collab.dto.collaboration.MessageCreateDto;
import esprit.tn.collab.dto.collaboration.MessageResponseDto;
import esprit.tn.collab.dto.collaboration.PollOptionResponseDto;
import esprit.tn.collab.dto.collaboration.PublicationResponseDto;
import esprit.tn.collab.entities.collaboration.ChatGroup;
import esprit.tn.collab.entities.collaboration.Message;
import esprit.tn.collab.entities.collaboration.MessagePollOption;
import esprit.tn.collab.entities.collaboration.MessageType;
import esprit.tn.collab.repositories.collaboration.ChatGroupRepository;
import esprit.tn.collab.repositories.collaboration.MessageRepository;
import esprit.tn.collab.repositories.collaboration.PublicationRepository;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final SentimentAnalysisService sentimentAnalysisService;
    private final CareBotService careBotService;
    private final NotificationService notificationService;
    private final UserClient userClient;
    private final ChatGroupRepository chatGroupRepository;
    private final PublicationRepository publicationRepository;
    private final PublicationService publicationService;

    public MessageService(MessageRepository messageRepository,
                          SimpMessagingTemplate messagingTemplate,
                          SentimentAnalysisService sentimentAnalysisService,
                          @Lazy CareBotService careBotService,
                          NotificationService notificationService,
                          UserClient userClient,
                          ChatGroupRepository chatGroupRepository,
                          PublicationRepository publicationRepository,
                          PublicationService publicationService) {
        this.messageRepository = messageRepository;
        this.messagingTemplate = messagingTemplate;
        this.sentimentAnalysisService = sentimentAnalysisService;
        this.careBotService = careBotService;
        this.notificationService = notificationService;
        this.userClient = userClient;
        this.chatGroupRepository = chatGroupRepository;
        this.publicationRepository = publicationRepository;
        this.publicationService = publicationService;
    }

    public List<MessageResponseDto> getAllMessages() {
        return messageRepository.findAll().stream().map(this::mapToResponseDto).collect(Collectors.toList());
    }

    public List<MessageResponseDto> getMessagesByGroup(String groupId) {
        return messageRepository.findByChatGroupIdOrderBySentAtDesc(groupId).stream()
                .map(this::mapToResponseDto).collect(Collectors.toList());
    }

    public List<MessageResponseDto> getDirectMessages(Long userId1, Long userId2) {
        return messageRepository.findDirectMessages(userId1, userId2).stream()
                .map(this::mapToResponseDto).collect(Collectors.toList());
    }

    public List<MessageResponseDto> getBotMessages(Long userId) {
        return messageRepository.findBotMessages(userId).stream()
                .map(this::mapToResponseDto).collect(Collectors.toList());
    }

    public MessageResponseDto getMessageById(String id) {
        return messageRepository.findById(id).map(this::mapToResponseDto).orElse(null);
    }

    public MessageResponseDto createMessage(MessageCreateDto dto, String mediaUrl, String mimeType) {
        ChatGroup group = null;
        if (dto.getChatGroupId() != null) {
            group = chatGroupRepository.findById(dto.getChatGroupId()).orElse(null);
        }

        Message message = new Message();
        message.setContent(dto.getContent());
        message.setSenderId(dto.getSenderId());
        message.setReceiverId(dto.getReceiverId());
        if (group != null) message.setChatGroupId(group.getId());
        message.setSentAt(Instant.now());
        message.setMediaUrl(mediaUrl);
        message.setMimeType(mimeType);

        if (dto.getType() != null) {
            message.setType(dto.getType());
            if (dto.getType() == MessageType.POLL) {
                message.setPollQuestion(dto.getPollQuestion());
                if (dto.getPollOptions() != null) {
                    for (String optText : dto.getPollOptions()) {
                        MessagePollOption opt = new MessagePollOption();
                        opt.setText(optText);
                        message.getPollOptions().add(opt);
                    }
                }
            }
        }

        if (dto.getParentMessageId() != null) {
            messageRepository.findById(dto.getParentMessageId()).ifPresent(parent -> {
                message.setParentMessageId(parent.getId());
                message.setParentMessageContent(parent.getContent());
            });
        }
        if (dto.getSharedPublicationId() != null) {
            message.setSharedPublicationId(dto.getSharedPublicationId());
        }

        Double score = sentimentAnalysisService.calculateSentimentScore(message.getContent());
        message.setSentimentScore(score);
        message.setDistressed(score <= -0.5);

        Message saved = messageRepository.save(message);
        MessageResponseDto responseDto = mapToResponseDto(saved);

        if (saved.getChatGroupId() != null) {
            messagingTemplate.convertAndSend("/topic/group/" + saved.getChatGroupId(), responseDto);
            ChatGroup g = group;
            if (g != null && saved.getSenderId() != null) {
                Map<String, Object> senderUser = userClient.getUserById(saved.getSenderId());
                String senderLabel = userClient.getFullName(senderUser);
                g.getMemberIds().stream().filter(uid -> !uid.equals(saved.getSenderId()))
                    .forEach(uid -> notificationService.createAndSend(uid,
                        senderLabel + " sent a message in \"" + g.getName() + "\"", "GROUP_MESSAGE"));
            }
        } else if (saved.getReceiverId() != null) {
            messagingTemplate.convertAndSendToUser(saved.getReceiverId().toString(), "/queue/direct", responseDto);
            if (saved.getSenderId() != null) {
                messagingTemplate.convertAndSendToUser(saved.getSenderId().toString(), "/queue/direct", responseDto);
                Map<String, Object> senderUser = userClient.getUserById(saved.getSenderId());
                notificationService.createAndSend(saved.getReceiverId(),
                    "New private message from " + userClient.getFullName(senderUser), "PRIVATE_MESSAGE");
            }
        } else if (saved.getType() == MessageType.BOT_MESSAGE && saved.getReceiverId() != null) {
            messagingTemplate.convertAndSendToUser(saved.getReceiverId().toString(), "/queue/direct", responseDto);
        }

        if (saved.getSenderId() != null) processMentions(saved.getContent(), saved.getSenderId());
        careBotService.processMessageForSupport(saved);
        return responseDto;
    }

    public MessageResponseDto updateMessage(String id, MessageCreateDto dto, String mediaUrl, String mimeType) {
        return messageRepository.findById(id).map(existing -> {
            existing.setContent(dto.getContent());
            if (mediaUrl != null) { existing.setMediaUrl(mediaUrl); existing.setMimeType(mimeType); }
            Message saved = messageRepository.save(existing);
            MessageResponseDto responseDto = mapToResponseDto(saved);
            if (saved.getChatGroupId() != null)
                messagingTemplate.convertAndSend("/topic/group/" + saved.getChatGroupId(), responseDto);
            else if (saved.getReceiverId() != null) {
                messagingTemplate.convertAndSendToUser(saved.getReceiverId().toString(), "/queue/direct", responseDto);
                if (saved.getSenderId() != null)
                    messagingTemplate.convertAndSendToUser(saved.getSenderId().toString(), "/queue/direct", responseDto);
            }
            return responseDto;
        }).orElse(null);
    }

    public void deleteMessage(String id) {
        messageRepository.findById(id).ifPresent(message -> {
            messageRepository.delete(message);
            MessageResponseDto deleteNotice = new MessageResponseDto();
            deleteNotice.setId(id);
            deleteNotice.setContent("__DELETED__");
            if (message.getChatGroupId() != null)
                messagingTemplate.convertAndSend("/topic/group/" + message.getChatGroupId(), deleteNotice);
            else if (message.getReceiverId() != null) {
                messagingTemplate.convertAndSendToUser(message.getReceiverId().toString(), "/queue/direct", deleteNotice);
                if (message.getSenderId() != null)
                    messagingTemplate.convertAndSendToUser(message.getSenderId().toString(), "/queue/direct", deleteNotice);
            }
        });
    }

    public MessageResponseDto mapToResponseDto(Message message) {
        MessageResponseDto dto = new MessageResponseDto();
        dto.setId(message.getId());
        dto.setContent(message.getContent());
        dto.setMediaUrl(message.getMediaUrl());
        dto.setMimeType(message.getMimeType());
        dto.setSentAt(message.getSentAt());
        dto.setDistressed(message.isDistressed());
        dto.setSentimentScore(message.getSentimentScore());
        dto.setPinned(message.isPinned());
        dto.setViewedByUserIds(message.getViewedByUserIds());

        if (message.getSenderId() != null) {
            dto.setSenderId(message.getSenderId());
            Map<String, Object> sender = userClient.getUserById(message.getSenderId());
            dto.setSenderName(userClient.getFullName(sender));
        }
        if (message.getReceiverId() != null) dto.setReceiverId(message.getReceiverId());
        if (message.getChatGroupId() != null) dto.setChatGroupId(message.getChatGroupId());

        if (message.getParentMessageId() != null) {
            dto.setParentMessageId(message.getParentMessageId());
            dto.setParentMessageContent(message.getParentMessageContent());
        }

        if (message.getSharedPublicationId() != null) {
            publicationRepository.findById(message.getSharedPublicationId()).ifPresent(pub -> {
                try { dto.setSharedPublication(publicationService.mapToResponseDto(pub)); }
                catch (Exception e) {
                    PublicationResponseDto min = new PublicationResponseDto();
                    min.setId(pub.getId());
                    min.setContent("[Post Preview Unavailable]");
                    dto.setSharedPublication(min);
                }
            });
        }

        dto.setType(message.getType());
        dto.setFromBot(message.getSenderId() == null
                && (message.getType() == MessageType.BOT_MESSAGE || message.getType() == MessageType.MEDICATION_REMINDER));
        dto.setPollQuestion(message.getPollQuestion());
        if (message.getPollOptions() != null) {
            dto.setPollOptions(message.getPollOptions().stream().map(opt -> {
                PollOptionResponseDto optDto = new PollOptionResponseDto();
                optDto.setId(opt.getId());
                optDto.setText(opt.getText());
                optDto.setVotes(opt.getVoterIds().size());
                optDto.setVoterIds(opt.getVoterIds());
                return optDto;
            }).collect(Collectors.toList()));
        }
        return dto;
    }

    public MessageResponseDto voteOnPoll(String messageId, Long userId, String optionId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));
        if (message.getType() != MessageType.POLL) throw new RuntimeException("Not a poll");
        for (MessagePollOption opt : message.getPollOptions()) {
            opt.getVoterIds().remove(userId);
            opt.setVotesCount(opt.getVoterIds().size());
        }
        message.getPollOptions().stream().filter(opt -> opt.getId().equals(optionId)).findFirst()
                .ifPresent(opt -> { opt.getVoterIds().add(userId); opt.setVotesCount(opt.getVoterIds().size()); });
        Message saved = messageRepository.save(message);
        MessageResponseDto responseDto = mapToResponseDto(saved);
        if (saved.getChatGroupId() != null)
            messagingTemplate.convertAndSend("/topic/group/" + saved.getChatGroupId(), responseDto);
        return responseDto;
    }

    public MessageResponseDto togglePin(String messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));
        message.setPinned(!message.isPinned());
        Message saved = messageRepository.save(message);
        MessageResponseDto responseDto = mapToResponseDto(saved);
        if (saved.getChatGroupId() != null)
            messagingTemplate.convertAndSend("/topic/group/" + saved.getChatGroupId(), responseDto);
        return responseDto;
    }

    private void processMentions(String content, Long senderId) {
        if (content == null || !content.contains("@")) return;
        Pattern p = Pattern.compile("@([a-zA-Z0-9À-ÿ._-]+(?:\\s[a-zA-Z0-9À-ÿ._-]+)*)");
        Matcher m = p.matcher(content);
        List<Map<String, Object>> allUsers = userClient.getAllUsers();
        while (m.find()) {
            String fullName = m.group(1).trim();
            allUsers.stream().filter(u -> userClient.getFullName(u).equalsIgnoreCase(fullName)).findFirst()
                .ifPresent(tagged -> {
                    Long taggedId = ((Number) tagged.get("id")).longValue();
                    if (!taggedId.equals(senderId)) {
                        Map<String, Object> su = userClient.getUserById(senderId);
                        notificationService.createAndSend(taggedId, userClient.getFullName(su) + " tagged you in a message", "TAG_MENTION");
                    }
                });
        }
    }
}
