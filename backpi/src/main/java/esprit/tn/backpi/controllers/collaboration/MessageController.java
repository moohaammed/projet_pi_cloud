package esprit.tn.backpi.controllers.collaboration;

import esprit.tn.backpi.dto.collaboration.MessageCreateDto;
import esprit.tn.backpi.dto.collaboration.MessageResponseDto;
import esprit.tn.backpi.services.collaboration.FileStorageService;
import esprit.tn.backpi.services.collaboration.MessageService;
import esprit.tn.backpi.entities.collaboration.MessageType;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
@CrossOrigin(origins = "http://localhost:4200")
@Validated
public class MessageController {

    private final MessageService messageService;
    private final FileStorageService fileStorageService;

    public MessageController(MessageService messageService, FileStorageService fileStorageService) {
        this.messageService = messageService;
        this.fileStorageService = fileStorageService;
    }

    @GetMapping
    public List<MessageResponseDto> getAllMessages() {
        return messageService.getAllMessages();
    }

    @GetMapping("/group/{groupId}")
    public List<MessageResponseDto> getMessagesByGroup(@PathVariable("groupId") Long groupId) {
        return messageService.getMessagesByGroup(groupId);
    }

    @GetMapping("/direct/{u1}/{u2}")
    public List<MessageResponseDto> getDirectMessages(@PathVariable("u1") Long u1, @PathVariable("u2") Long u2) {
        return messageService.getDirectMessages(u1, u2);
    }

    @GetMapping("/bot/{userId}")
    public List<MessageResponseDto> getBotMessages(@PathVariable("userId") Long userId) {
        return messageService.getBotMessages(userId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MessageResponseDto> getMessageById(@PathVariable("id") Long id) {
        MessageResponseDto message = messageService.getMessageById(id);
        return message != null ? ResponseEntity.ok(message) : ResponseEntity.notFound().build();
    }

    @PostMapping(consumes = "multipart/form-data")
    public MessageResponseDto createMessage(
            @Valid @ModelAttribute MessageCreateDto dto,
            @RequestParam(value = "file", required = false) MultipartFile file) {

        String mediaUrl = null;
        String mimeType = null;

        if (file != null && !file.isEmpty()) {
            mediaUrl = fileStorageService.storeFile(file);
            mimeType = file.getContentType();
        }

        return messageService.createMessage(dto, mediaUrl, mimeType);
    }

    @PutMapping(value = "/{id}", consumes = "multipart/form-data")
    public ResponseEntity<MessageResponseDto> updateMessage(
            @PathVariable("id") Long id, 
            @Valid @ModelAttribute MessageCreateDto dto,
            @RequestParam(value = "file", required = false) MultipartFile file) {
            
        String mediaUrl = null;
        String mimeType = null;

        if (file != null && !file.isEmpty()) {
            mediaUrl = fileStorageService.storeFile(file);
            mimeType = file.getContentType();
        }
            
        MessageResponseDto message = messageService.updateMessage(id, dto, mediaUrl, mimeType);
        return message != null ? ResponseEntity.ok(message) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMessage(@PathVariable("id") Long id) {
        messageService.deleteMessage(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/vote")
    public MessageResponseDto voteOnPoll(
            @PathVariable("id") Long id,
            @RequestParam("userId") Long userId,
            @RequestParam("optionId") Long optionId) {
        return messageService.voteOnPoll(id, userId, optionId);
    }
 
    @PostMapping("/{id}/pin")
    public MessageResponseDto togglePin(@PathVariable("id") Long id) {
        return messageService.togglePin(id);
    }
}
