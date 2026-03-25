package esprit.tn.backpi.services;

import esprit.tn.backpi.entities.Message;
import esprit.tn.backpi.repositories.MessageRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final SentimentAnalysisService sentimentAnalysisService;

    public MessageService(MessageRepository messageRepository, 
                          SimpMessagingTemplate messagingTemplate,
                          SentimentAnalysisService sentimentAnalysisService) {
        this.messageRepository = messageRepository;
        this.messagingTemplate = messagingTemplate;
        this.sentimentAnalysisService = sentimentAnalysisService;
    }

    public List<Message> getAllMessages() {
        return messageRepository.findAll();
    }

    public List<Message> getMessagesByGroup(Long groupId) {
        List<Message> msgs = messageRepository.findByChatGroupId(groupId);
        System.out.println("DEBUG: Fetched " + msgs.size() + " messages for group " + groupId);
        return msgs;
    }

    public Message getMessageById(Long id) {
        return messageRepository.findById(id).orElse(null);
    }

    public Message createMessage(Message message) {
        // Run sentiment analysis before saving
        boolean isWorrying = sentimentAnalysisService.isWorryingContent(message.getContent());
        message.setDistressed(isWorrying);
        System.out.println("DEBUG [MessageService]: Saving message. Distressed: " + isWorrying);
        
        Message savedObj = messageRepository.save(message);
        if (savedObj.getChatGroup() != null) {
            messagingTemplate.convertAndSend("/topic/group/" + savedObj.getChatGroup().getId(), savedObj);
        }
        return savedObj;
    }

    public Message updateMessage(Long id, Message updatedMessage) {
        return messageRepository.findById(id).map(existingMessage -> {
            existingMessage.setContent(updatedMessage.getContent());
            return messageRepository.save(existingMessage);
        }).orElse(null);
    }

    public void deleteMessage(Long id) {
        messageRepository.deleteById(id);
    }
}
