package esprit.tn.collab.controllers.collaboration;

import esprit.tn.collab.dto.collaboration.PublicationCreateDto;
import esprit.tn.collab.dto.collaboration.PublicationResponseDto;
import esprit.tn.collab.entities.collaboration.PublicationType;
import esprit.tn.collab.services.collaboration.FileStorageService;
import esprit.tn.collab.services.collaboration.PublicationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/publications")
@CrossOrigin(origins = "http://localhost:4200")
public class PublicationController {

    private final PublicationService publicationService;
    private final FileStorageService fileStorageService;

    public PublicationController(PublicationService publicationService, FileStorageService fileStorageService) {
        this.publicationService = publicationService;
        this.fileStorageService = fileStorageService;
    }

    @GetMapping
    public List<PublicationResponseDto> getAllPublications() { return publicationService.getAllPublications(); }

    @GetMapping("/feed/{userId}")
    public List<PublicationResponseDto> getPersonalizedFeed(@PathVariable Long userId) { return publicationService.getPersonalizedFeed(userId); }

    @GetMapping("/group/{groupId}")
    public List<PublicationResponseDto> getGroupFeed(@PathVariable Long groupId) { return publicationService.getGroupFeed(groupId); }

    @GetMapping("/{id}")
    public ResponseEntity<PublicationResponseDto> getPublicationById(@PathVariable Long id) {
        PublicationResponseDto p = publicationService.getPublicationById(id);
        return p != null ? ResponseEntity.ok(p) : ResponseEntity.notFound().build();
    }

    @PostMapping(consumes = "multipart/form-data")
    public PublicationResponseDto createPublication(@Valid @ModelAttribute PublicationCreateDto dto,
                                                    @RequestParam(value = "type", required = false) String typeStr,
                                                    @RequestParam(value = "pollOptions", required = false) List<String> pollOptions,
                                                    @RequestParam(value = "pollQuestion", required = false) String pollQuestion,
                                                    @RequestParam(value = "linkedEventId", required = false) Long linkedEventId,
                                                    @RequestParam(value = "file", required = false) MultipartFile file) {
        if (linkedEventId != null) dto.setLinkedEventId(linkedEventId);
        if (typeStr != null && dto.getType() == null) {
            try { dto.setType(PublicationType.valueOf(typeStr.toUpperCase())); } catch (Exception ignored) {}
        }
        if (pollOptions != null) dto.setPollOptions(pollOptions);
        if (pollQuestion != null) dto.setPollQuestion(pollQuestion);
        String mediaUrl = null, mimeType = null;
        if (file != null && !file.isEmpty()) { mediaUrl = fileStorageService.storeFile(file); mimeType = file.getContentType(); }
        return publicationService.createPublication(dto, mediaUrl, mimeType);
    }

    @PutMapping(value = "/{id}", consumes = "multipart/form-data")
    public ResponseEntity<PublicationResponseDto> updatePublication(@PathVariable Long id, @Valid @ModelAttribute PublicationCreateDto dto,
                                                                    @RequestParam(value = "file", required = false) MultipartFile file) {
        String mediaUrl = null, mimeType = null;
        if (file != null && !file.isEmpty()) { mediaUrl = fileStorageService.storeFile(file); mimeType = file.getContentType(); }
        PublicationResponseDto p = publicationService.updatePublication(id, dto, mediaUrl, mimeType);
        return p != null ? ResponseEntity.ok(p) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePublication(@PathVariable Long id) { publicationService.deletePublication(id); return ResponseEntity.noContent().build(); }

    @PostMapping("/{id}/poll/vote")
    public ResponseEntity<PublicationResponseDto> voteInPoll(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        int optionIndex = (int) payload.get("optionIndex");
        Long userId = Long.valueOf(payload.get("userId").toString());
        PublicationResponseDto result = publicationService.voteInPoll(id, optionIndex, userId);
        return result != null ? ResponseEntity.ok(result) : ResponseEntity.notFound().build();
    }

    @PostMapping("/{id}/support")
    public ResponseEntity<PublicationResponseDto> toggleSupport(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        Long userId = Long.valueOf(payload.get("userId").toString());
        PublicationResponseDto result = publicationService.toggleSupport(id, userId);
        return result != null ? ResponseEntity.ok(result) : ResponseEntity.notFound().build();
    }
}
