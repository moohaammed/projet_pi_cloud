package esprit.tn.collab.controllers.collaboration;

import esprit.tn.collab.dto.collaboration.MessageCreateDto;
import esprit.tn.collab.dto.collaboration.MessageResponseDto;
import esprit.tn.collab.services.collaboration.FileStorageService;
import esprit.tn.collab.services.collaboration.MessageService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

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
    public List<MessageResponseDto> getMessagesByGroup(@PathVariable Long groupId) { return messageService.getMessagesByGroup(groupId); }

    @GetMapping("/direct/{u1}/{u2}")
    public List<MessageResponseDto> getDirectMessages(@PathVariable Long u1, @PathVariable Long u2) { return messageService.getDirectMessages(u1, u2); }

    @GetMapping("/bot/{userId}")
    public List<MessageResponseDto> getBotMessages(@PathVariable Long userId) { return messageService.getBotMessages(userId); }

    @GetMapping("/{id}")
    public ResponseEntity<MessageResponseDto> getMessageById(@PathVariable Long id) {
        MessageResponseDto msg = messageService.getMessageById(id);
        return msg != null ? ResponseEntity.ok(msg) : ResponseEntity.notFound().build();
    }

    @PostMapping(consumes = "multipart/form-data")
    public MessageResponseDto createMessage(@Valid @ModelAttribute MessageCreateDto dto,
                                            @RequestParam(value = "file", required = false) MultipartFile file) {
        String mediaUrl = null, mimeType = null;
        if (file != null && !file.isEmpty()) { mediaUrl = fileStorageService.storeFile(file); mimeType = file.getContentType(); }
        return messageService.createMessage(dto, mediaUrl, mimeType);
    }

    @PutMapping(value = "/{id}", consumes = "multipart/form-data")
    public ResponseEntity<MessageResponseDto> updateMessage(@PathVariable Long id, @Valid @ModelAttribute MessageCreateDto dto,
                                                            @RequestParam(value = "file", required = false) MultipartFile file) {
        String mediaUrl = null, mimeType = null;
        if (file != null && !file.isEmpty()) { mediaUrl = fileStorageService.storeFile(file); mimeType = file.getContentType(); }
        MessageResponseDto msg = messageService.updateMessage(id, dto, mediaUrl, mimeType);
        return msg != null ? ResponseEntity.ok(msg) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMessage(@PathVariable Long id) { messageService.deleteMessage(id); return ResponseEntity.noContent().build(); }

    @PostMapping("/{id}/vote")
    public MessageResponseDto voteOnPoll(@PathVariable Long id, @RequestParam Long userId, @RequestParam Long optionId) {
        return messageService.voteOnPoll(id, userId, optionId);
    }

    @PostMapping("/{id}/pin")
    public MessageResponseDto togglePin(@PathVariable Long id) { return messageService.togglePin(id); }
}
