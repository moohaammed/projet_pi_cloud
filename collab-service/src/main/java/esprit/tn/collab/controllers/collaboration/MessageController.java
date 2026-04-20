package esprit.tn.collab.controllers.collaboration;

import esprit.tn.collab.dto.collaboration.MessageCreateDto;
import esprit.tn.collab.dto.collaboration.MessageResponseDto;
import esprit.tn.collab.services.collaboration.FileStorageService;
import esprit.tn.collab.services.collaboration.MessageService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
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
    public List<MessageResponseDto> getAllMessages() { return messageService.getAllMessages(); }

    @GetMapping("/group/{groupId}")
    public List<MessageResponseDto> getMessagesByGroup(@PathVariable String groupId) {
        return messageService.getMessagesByGroup(groupId);
    }

    
    @GetMapping("/group/{groupId}/page")
    public List<MessageResponseDto> getMessagesByGroupPaged(
            @PathVariable String groupId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {
        return messageService.getMessagesByGroupPaged(groupId, page, size);
    }

    @GetMapping("/direct/{u1}/{u2}")
    public List<MessageResponseDto> getDirectMessages(@PathVariable Long u1, @PathVariable Long u2) {
        return messageService.getDirectMessages(u1, u2);
    }

    @GetMapping("/bot/{userId}")
    public List<MessageResponseDto> getBotMessages(@PathVariable Long userId) {
        return messageService.getBotMessages(userId);
    }

    @GetMapping("/peers/{userId}")
    public List<Long> getConversationPeers(@PathVariable Long userId) {
        return messageService.getConversationPeers(userId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MessageResponseDto> getMessageById(@PathVariable String id) {
        MessageResponseDto msg = messageService.getMessageById(id);
        return msg != null ? ResponseEntity.ok(msg) : ResponseEntity.notFound().build();
    }

    @PostMapping(consumes = "multipart/form-data")
    public MessageResponseDto createMessage(@Valid @ModelAttribute MessageCreateDto dto,
                                            @RequestParam(value = "files", required = false) List<MultipartFile> files) {
        List<String> mediaUrls = new ArrayList<>();
        List<String> mimeTypes = new ArrayList<>();
        
        if (files != null && !files.isEmpty()) {
            for (MultipartFile file : files) {
                if (!file.isEmpty()) {
                    String url = fileStorageService.storeFile(file);
                    if (url != null) {
                        mediaUrls.add(url);
                        mimeTypes.add(file.getContentType());
                    }
                }
            }
        }
        
        return messageService.createMessage(dto, mediaUrls, mimeTypes);
    }

    @PutMapping(value = "/{id}", consumes = "multipart/form-data")
    public ResponseEntity<MessageResponseDto> updateMessage(@PathVariable String id,
                                                            @Valid @ModelAttribute MessageCreateDto dto,
                                                            @RequestParam(value = "files", required = false) List<MultipartFile> files) {
        List<String> mediaUrls = new ArrayList<>();
        List<String> mimeTypes = new ArrayList<>();
        
        if (files != null && !files.isEmpty()) {
            for (MultipartFile file : files) {
                if (!file.isEmpty()) {
                    String url = fileStorageService.storeFile(file);
                    if (url != null) {
                        mediaUrls.add(url);
                        mimeTypes.add(file.getContentType());
                    }
                }
            }
        }
        
        MessageResponseDto msg = messageService.updateMessage(id, dto, mediaUrls, mimeTypes);
        return msg != null ? ResponseEntity.ok(msg) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMessage(@PathVariable String id) {
        messageService.deleteMessage(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/vote")
    public MessageResponseDto voteOnPoll(@PathVariable String id,
                                         @RequestParam Long userId,
                                         @RequestParam String optionId) {
        return messageService.voteOnPoll(id, userId, optionId);
    }

    @PostMapping("/{id}/pin")
    public MessageResponseDto togglePin(@PathVariable String id) {
        return messageService.togglePin(id);
    }

    
    @PostMapping("/live-comment")
    public ResponseEntity<MessageResponseDto> sendLiveComment(
            @RequestParam Long senderId,
            @RequestParam Long broadcasterId,
            @RequestParam String content) {
        return ResponseEntity.ok(messageService.sendLiveComment(senderId, broadcasterId, content));
    }

    
    @PostMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable String id, @RequestParam Long userId) {
        messageService.markAsRead(id, userId);
        return ResponseEntity.ok().build();
    }
}
