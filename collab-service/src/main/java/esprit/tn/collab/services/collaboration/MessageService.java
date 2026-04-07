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
import org.springframework.transaction.annotation.Transactional;

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

    public List<MessageResponseDto> getMessagesByGroup(Long groupId) {
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

    public MessageResponseDto getMessageById(Long id) {
        return messageRepository.findById(id).map(this::mapToResponseDto).orElse(null);
    }

    @Transactional
    public MessageResponseDto createMessage(MessageCreateDto dto, String mediaUrl, String mimeType) {
        ChatGroup group = null;
        if (dto.getChatGroupId() != null) {
            group = chatGroupRepository.findById(dto.getChatGroupId())
                    .orElseThrow(() -> new RuntimeException("ChatGroup not found: " + dto.getChatGroupId()));
        }

        Message message = new Message();
        message.setContent(dto.getContent());
        message.setSenderId(dto.getSenderId());
        message.setReceiverId(dto.getReceiverId());
        message.setChatGroup(group);
        message.setSentAt(Instant.now());
        message.setMediaUrl(mediaUrl);
        message.setMimeType(mimeType);

        if (dto.getType() != null) {
            message.setType(dto.getType());
            if (dto.getType() == MessageType.POLL) {
                message.setPollQuestion(dto.getPollQuestion());
                if (dto.getPollOptions() != null) {
                    for (String optionContent : dto.getPollOptions()) {
                        MessagePollOption opt = new MessagePollOption();
                        opt.setText(optionContent);
                        opt.setMessage(message);
                        message.getPollOptions().add(opt);
                    }
                }
            }
        }

        if (dto.getParentMessageId() != null) {
            messageRepository.findById(dto.getParentMessageId()).ifPresent(message::setParentMessage);
        }
        if (dto.getSharedPublicationId() != null) {
            publicationRepository.findById(dto.getSharedPublicationId()).ifPresent(message::setSharedPublication);
        }

        Double score = sentimentAnalysisService.calculateSentimentScore(message.getContent());
        message.setSentimentScore(score);
        message.setDistressed(score <= -0.5);

        Message saved = messageRepository.save(message);
        MessageResponseDto responseDto = mapToResponseDto(saved);

        // Broadcast
        if (saved.getChatGroup() != null) {
            messagingTemplate.convertAndSend("/topic/group/" + saved.getChatGroup().getId(), responseDto);
            // Notify group members
            Map<String, Object> senderUser = userClient.getUserById(saved.getSenderId());
            String senderLabel = userClient.getFullName(senderUser);
            String groupName = saved.getChatGroup().getName();
            saved.getChatGroup().getMemberIds().stream()
                .filter(uid -> !uid.equals(saved.getSenderId()))
                .forEach(uid -> notificationService.createAndSend(uid,
                    senderLabel + " sent a message in \"" + groupName + "\"", "GROUP_MESSAGE"));
        } else if (saved.getReceiverId() != null) {
            messagingTemplate.convertAndSendToUser(saved.getReceiverId().toString(), "/queue/direct", responseDto);
            if (saved.getSenderId() != null) {
                messagingTemplate.convertAndSendToUser(saved.getSenderId().toString(), "/queue/direct", responseDto);
                Map<String, Object> senderUser = userClient.getUserById(saved.getSenderId());
                notificationService.createAndSend(saved.getReceiverId(),
                    "New private message from " + userClient.getFullName(senderUser), "PRIVATE_MESSAGE");
            }
        } else if (saved.getType() == MessageType.BOT_MESSAGE) {
            if (saved.getReceiverId() != null) {
                messagingTemplate.convertAndSendToUser(saved.getReceiverId().toString(), "/queue/direct", responseDto);
            }
        }

        // Mention detection
        if (saved.getSenderId() != null) processMentions(saved.getContent(), saved.getSenderId());

        careBotService.processMessageForSupport(saved);
        return responseDto;
    }

    public MessageResponseDto updateMessage(Long id, MessageCreateDto dto, String mediaUrl, String mimeType) {
        return messageRepository.findById(id).map(existing -> {
            existing.setContent(dto.getContent());
            if (mediaUrl != null) { existing.setMediaUrl(mediaUrl); existing.setMimeType(mimeType); }
            Message saved = messageRepository.save(existing);
            MessageResponseDto responseDto = mapToResponseDto(saved);
            if (saved.getChatGroup() != null) {
                messagingTemplate.convertAndSend("/topic/group/" + saved.getChatGroup().getId(), responseDto);
            } else if (saved.getReceiverId() != null) {
                messagingTemplate.convertAndSendToUser(saved.getReceiverId().toString(), "/queue/direct", responseDto);
                if (saved.getSenderId() != null)
                    messagingTemplate.convertAndSendToUser(saved.getSenderId().toString(), "/queue/direct", responseDto);
            }
            return responseDto;
        }).orElse(null);
    }

    public void deleteMessage(Long id) {
        messageRepository.findById(id).ifPresent(message -> {
            messageRepository.delete(message);
            MessageResponseDto deleteNotice = new MessageResponseDto();
            deleteNotice.setId(id);
            deleteNotice.setContent("__DELETED__");
            if (message.getChatGroup() != null) {
                messagingTemplate.convertAndSend("/topic/group/" + message.getChatGroup().getId(), deleteNotice);
            } else if (message.getReceiverId() != null) {
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
        if (message.getChatGroup() != null) dto.setChatGroupId(message.getChatGroup().getId());

        if (message.getParentMessage() != null) {
            dto.setParentMessageId(message.getParentMessage().getId());
            dto.setParentMessageContent(message.getParentMessage().getContent());
            if (message.getParentMessage().getSenderId() != null) {
                Map<String, Object> parentSender = userClient.getUserById(message.getParentMessage().getSenderId());
                dto.setParentMessageSenderName(userClient.getFullName(parentSender));
            }
        }

        if (message.getSharedPublication() != null) {
            try {
                dto.setSharedPublication(publicationService.mapToResponseDto(message.getSharedPublication()));
            } catch (Exception e) {
                PublicationResponseDto minimalPub = new PublicationResponseDto();
                minimalPub.setId(message.getSharedPublication().getId());
                minimalPub.setContent("[Post Preview Unavailable]");
                dto.setSharedPublication(minimalPub);
            }
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

    public MessageResponseDto voteOnPoll(Long messageId, Long userId, Long optionId) {
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
        if (saved.getChatGroup() != null)
            messagingTemplate.convertAndSend("/topic/group/" + saved.getChatGroup().getId(), responseDto);
        return responseDto;
    }

    public MessageResponseDto togglePin(Long messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));
        message.setPinned(!message.isPinned());
        Message saved = messageRepository.save(message);
        MessageResponseDto responseDto = mapToResponseDto(saved);
        if (saved.getChatGroup() != null)
            messagingTemplate.convertAndSend("/topic/group/" + saved.getChatGroup().getId(), responseDto);
        return responseDto;
    }

    private void processMentions(String content, Long senderId) {
        if (content == null || !content.contains("@")) return;
        Pattern mentionPattern = Pattern.compile("@([a-zA-Z0-9À-ÿ._-]+(?:\\s[a-zA-Z0-9À-ÿ._-]+)*)");
        Matcher matcher = mentionPattern.matcher(content);
        List<Map<String, Object>> allUsers = userClient.getAllUsers();
        while (matcher.find()) {
            String fullName = matcher.group(1).trim();
            allUsers.stream()
                .filter(u -> userClient.getFullName(u).equalsIgnoreCase(fullName))
                .findFirst()
                .ifPresent(tagged -> {
                    Long taggedId = ((Number) tagged.get("id")).longValue();
                    if (!taggedId.equals(senderId)) {
                        Map<String, Object> senderUser = userClient.getUserById(senderId);
                        notificationService.createAndSend(taggedId,
                            userClient.getFullName(senderUser) + " tagged you in a message", "TAG_MENTION");
                    }
                });
        }
    }
}
