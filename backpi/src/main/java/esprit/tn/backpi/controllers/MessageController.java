package esprit.tn.backpi.controllers;

import esprit.tn.backpi.entities.Message;
import esprit.tn.backpi.entities.User;
import esprit.tn.backpi.entities.ChatGroup;
import esprit.tn.backpi.services.MessageService;
import esprit.tn.backpi.services.FileStorageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/messages")
@CrossOrigin(origins = "http://localhost:4200")
public class MessageController {

    private final MessageService messageService;
    private final FileStorageService fileStorageService;

    public MessageController(MessageService messageService, FileStorageService fileStorageService) {
        this.messageService = messageService;
        this.fileStorageService = fileStorageService;
    }

    @GetMapping
    public List<Message> getAllMessages() {
        return messageService.getAllMessages();
    }

    @GetMapping("/group/{groupId}")
    public List<Message> getMessagesByGroup(@PathVariable("groupId") Long groupId) {
        return messageService.getMessagesByGroup(groupId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Message> getMessageById(@PathVariable("id") Long id) {
        Message message = messageService.getMessageById(id);
        return message != null ? ResponseEntity.ok(message) : ResponseEntity.notFound().build();
    }

    @PostMapping(consumes = "multipart/form-data")
    public Message createMessage(
            @RequestParam("content") String content,
            @RequestParam("senderId") Long senderId,
            @RequestParam("chatGroupId") Long chatGroupId,
            @RequestParam(value = "file", required = false) MultipartFile file) {
            
        Message message = new Message();
        message.setContent(content);
        message.setSentAt(Instant.now());
        
        User sender = new User();
        sender.setId(senderId);
        message.setSender(sender);
        
        ChatGroup group = new ChatGroup();
        group.setId(chatGroupId);
        message.setChatGroup(group);
        
        if (file != null && !file.isEmpty()) {
            String filePath = fileStorageService.storeFile(file);
            message.setMediaUrl(filePath);
            message.setMimeType(file.getContentType());
        }
        
        return messageService.createMessage(message);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Message> updateMessage(@PathVariable("id") Long id, @RequestBody Message updatedMessage) {
        Message message = messageService.updateMessage(id, updatedMessage);
        return message != null ? ResponseEntity.ok(message) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMessage(@PathVariable("id") Long id) {
        messageService.deleteMessage(id);
        return ResponseEntity.noContent().build();
    }
}
