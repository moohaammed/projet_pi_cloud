package esprit.tn.backpi.controllers.collaboration;

import esprit.tn.backpi.dto.collaboration.PublicationCreateDto;
import esprit.tn.backpi.dto.collaboration.PublicationResponseDto;
import esprit.tn.backpi.entities.collaboration.PublicationType;
import esprit.tn.backpi.services.collaboration.PublicationService;
import esprit.tn.backpi.services.collaboration.FileStorageService;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("/api/publications")
@CrossOrigin(origins = "http://localhost:4200")
@Validated
public class PublicationController {

    private final PublicationService publicationService;
    private final FileStorageService fileStorageService;

    public PublicationController(PublicationService publicationService, FileStorageService fileStorageService) {
        this.publicationService = publicationService;
        this.fileStorageService = fileStorageService;
    }

    @GetMapping
    public List<PublicationResponseDto> getAllPublications() {
        return publicationService.getAllPublications();
    }

    @GetMapping("/feed/{userId}")
    public List<PublicationResponseDto> getPersonalizedFeed(@PathVariable("userId") Long userId) {
        return publicationService.getPersonalizedFeed(userId);
    }

    @GetMapping("/group/{groupId}")
    public List<PublicationResponseDto> getGroupFeed(@PathVariable("groupId") Long groupId) {
        return publicationService.getGroupFeed(groupId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PublicationResponseDto> getPublicationById(@PathVariable("id") Long id) {
        PublicationResponseDto publication = publicationService.getPublicationById(id);
        return publication != null ? ResponseEntity.ok(publication) : ResponseEntity.notFound().build();
    }

    @PostMapping(consumes = "multipart/form-data")
    public PublicationResponseDto createPublication(
            @Valid @ModelAttribute PublicationCreateDto dto,
            @RequestParam(value = "type", required = false) String typeStr,
            @RequestParam(value = "pollOptions", required = false) List<String> pollOptions,
            @RequestParam(value = "pollQuestion", required = false) String pollQuestion,
            @RequestParam(value = "linkedEventId", required = false) Long linkedEventId,
            @RequestParam(value = "file", required = false) MultipartFile file) {

        if (linkedEventId != null) {
            dto.setLinkedEventId(linkedEventId);
        }

        // Log incoming poll options
        if (typeStr != null && dto.getType() == null) {
            try {
                dto.setType(PublicationType.valueOf(typeStr.toUpperCase()));
            } catch (Exception e) {
                // Ignore invalid type
            }
        }
        if (pollOptions != null) {
            dto.setPollOptions(pollOptions);
        }
        if (pollQuestion != null) {
            dto.setPollQuestion(pollQuestion);
        }

        String mediaUrl = null;
        String mimeType = null;

        if (file != null && !file.isEmpty()) {
            mediaUrl = fileStorageService.storeFile(file);
            mimeType = file.getContentType();
        }

        return publicationService.createPublication(dto, mediaUrl, mimeType);
    }

    @PutMapping(value = "/{id}", consumes = "multipart/form-data")
    public ResponseEntity<PublicationResponseDto> updatePublication(
            @PathVariable("id") Long id, 
            @Valid @ModelAttribute PublicationCreateDto dto,
            @RequestParam(value = "file", required = false) MultipartFile file) {
            
        String mediaUrl = null;
        String mimeType = null;

        if (file != null && !file.isEmpty()) {
            mediaUrl = fileStorageService.storeFile(file);
            mimeType = file.getContentType();
        }
            
        PublicationResponseDto publication = publicationService.updatePublication(id, dto, mediaUrl, mimeType);
        return publication != null ? ResponseEntity.ok(publication) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePublication(@PathVariable("id") Long id) {
        publicationService.deletePublication(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/poll/vote")
    public ResponseEntity<PublicationResponseDto> voteInPoll(
            @PathVariable("id") Long id,
            @RequestBody java.util.Map<String, Object> payload) {
        
        int optionIndex = (int) payload.get("optionIndex");
        Long userId = Long.valueOf(payload.get("userId").toString());
        
        PublicationResponseDto result = publicationService.voteInPoll(id, optionIndex, userId);
        return result != null ? ResponseEntity.ok(result) : ResponseEntity.notFound().build();
    }
}
