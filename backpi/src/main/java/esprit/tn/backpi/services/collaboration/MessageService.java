package esprit.tn.backpi.services.collaboration;

import esprit.tn.backpi.dto.collaboration.MessageCreateDto;
import esprit.tn.backpi.dto.collaboration.MessageResponseDto;
import esprit.tn.backpi.dto.collaboration.PollOptionResponseDto;
import esprit.tn.backpi.entities.collaboration.ChatGroup;
import esprit.tn.backpi.entities.collaboration.Message;
import esprit.tn.backpi.entities.collaboration.MessagePollOption;
import esprit.tn.backpi.entities.collaboration.MessageType;
import esprit.tn.backpi.entity.User;
import esprit.tn.backpi.repositories.collaboration.ChatGroupRepository;
import esprit.tn.backpi.repositories.collaboration.MessagePollOptionRepository;
import esprit.tn.backpi.repositories.collaboration.MessageRepository;
import esprit.tn.backpi.repository.UserRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
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
    private final UserRepository userRepository;
    private final ChatGroupRepository chatGroupRepository;

    private final MessagePollOptionRepository pollOptionRepository;

    public MessageService(MessageRepository messageRepository,
                          SimpMessagingTemplate messagingTemplate,
                          SentimentAnalysisService sentimentAnalysisService,
                          CareBotService careBotService,
                          NotificationService notificationService,
                          UserRepository userRepository,
                          ChatGroupRepository chatGroupRepository,
                          MessagePollOptionRepository pollOptionRepository) {
        this.messageRepository = messageRepository;
        this.messagingTemplate = messagingTemplate;
        this.sentimentAnalysisService = sentimentAnalysisService;
        this.careBotService = careBotService;
        this.notificationService = notificationService;
        this.userRepository = userRepository;
        this.chatGroupRepository = chatGroupRepository;
        this.pollOptionRepository = pollOptionRepository;
    }

    public List<MessageResponseDto> getAllMessages() {
        return messageRepository.findAll().stream()
                .map(this::mapToResponseDto)
                .collect(Collectors.toList());
    }

    public List<MessageResponseDto> getMessagesByGroup(Long groupId) {
        List<Message> msgs = messageRepository.findByChatGroupIdOrderBySentAtDesc(groupId);
        return msgs.stream()
                .map(this::mapToResponseDto)
                .collect(Collectors.toList());
    }

    public List<MessageResponseDto> getDirectMessages(Long userId1, Long userId2) {
        List<Message> msgs = messageRepository.findDirectMessages(userId1, userId2);
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
            Message parent = messageRepository.findById(dto.getParentMessageId())
                    .orElseThrow(() -> new RuntimeException("Parent message not found: " + dto.getParentMessageId()));
            message.setParentMessage(parent);
        }

        Double score = sentimentAnalysisService.calculateSentimentScore(message.getContent());
        message.setSentimentScore(score);
        message.setDistressed(score <= -0.5);

        Message savedObj = messageRepository.save(message);
        MessageResponseDto responseDto = mapToResponseDto(savedObj);

        // ── @mention detection ─────────────────────────────────────────────
        processMentions(savedObj.getContent(), sender);

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
        dto.setPinned(message.isPinned());
        dto.setViewedByUserIds(message.getViewedByUserIds());

        if (message.getSender() != null) {
            dto.setSenderId(message.getSender().getId());
            dto.setSenderName(message.getSender().getNom());
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
                dto.setParentMessageSenderName(message.getParentMessage().getSender().getNom());
            }
        }

        dto.setType(message.getType());
        dto.setPollQuestion(message.getPollQuestion());
        if (message.getPollOptions() != null) {
            dto.setPollOptions(message.getPollOptions().stream()
                .map(opt -> {
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

        if (message.getType() != MessageType.POLL) {
            throw new RuntimeException("Message is not a poll");
        }

        // Remove user's previous votes on this poll
        for (MessagePollOption opt : message.getPollOptions()) {
            opt.getVoterIds().remove(userId);
            opt.setVotesCount(opt.getVoterIds().size());
        }

        // Add new vote
        MessagePollOption selectedOption = message.getPollOptions().stream()
                .filter(opt -> opt.getId().equals(optionId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Option not found"));
        
        selectedOption.getVoterIds().add(userId);
        selectedOption.setVotesCount(selectedOption.getVoterIds().size());

        Message saved = messageRepository.save(message);
        MessageResponseDto responseDto = mapToResponseDto(saved);

        // Broadcast update
        if (saved.getChatGroup() != null) {
            messagingTemplate.convertAndSend("/topic/group/" + saved.getChatGroup().getId(), responseDto);
        } else if (saved.getReceiver() != null) {
            messagingTemplate.convertAndSendToUser(saved.getReceiver().getId().toString(), "/queue/direct", responseDto);
            messagingTemplate.convertAndSendToUser(saved.getSender().getId().toString(), "/queue/direct", responseDto);
        }

        return responseDto;
    }
    public MessageResponseDto togglePin(Long messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));
        message.setPinned(!message.isPinned());
        Message saved = messageRepository.save(message);
        MessageResponseDto responseDto = mapToResponseDto(saved);
        
        // Broadcast update via WebSocket
        if (saved.getChatGroup() != null) {
            messagingTemplate.convertAndSend("/topic/group/" + saved.getChatGroup().getId(), responseDto);
        } else if (saved.getReceiver() != null) {
            messagingTemplate.convertAndSendToUser(saved.getReceiver().getId().toString(), "/queue/direct", responseDto);
            messagingTemplate.convertAndSendToUser(saved.getSender().getId().toString(), "/queue/direct", responseDto);
        }
        
        return responseDto;
    }

    /**
     * Parses @Name tokens from the message content and sends a TAG_MENTION
     * notification to each matched user (excluding the sender).
     */
    private void processMentions(String content, User sender) {
        if (content == null || !content.contains("@")) return;

        // Regex to match @Name patterns (supports accents, dots, dashes, etc.)
        Pattern mentionPattern = Pattern.compile("@([a-zA-Z0-9À-ÿ._-]+(?:\\s[a-zA-Z0-9À-ÿ._-]+)*)");
        Matcher matcher = mentionPattern.matcher(content);

        while (matcher.find()) {
            String fullName = matcher.group(1).trim();
            String currentTry = fullName;
            boolean found = false;

            while (!currentTry.isEmpty()) {
                // Remove trailing punctuation and trim
                String cleanName = currentTry.replaceAll("[.,!?;:]+$", "").trim();
                
                Optional<User> userOpt = userRepository.findByFullName(cleanName);
                if (userOpt.isPresent()) {
                    User tagged = userOpt.get();
                    if (!tagged.getId().equals(sender.getId())) {
                        String senderLabel = sender.getNom() != null ? sender.getNom() : "User " + sender.getId();
                        notificationService.createAndSend(
                            tagged.getId(),
                            senderLabel + " tagged you in a message",
                            "TAG_MENTION"
                        );
                    }
                    found = true;
                    break;
                }

                // Peel off the last word
                int lastSpace = currentTry.lastIndexOf(' ');
                if (lastSpace != -1) {
                    currentTry = currentTry.substring(0, lastSpace);
                } else {
                    currentTry = "";
                }
            }
        }
    }
}
