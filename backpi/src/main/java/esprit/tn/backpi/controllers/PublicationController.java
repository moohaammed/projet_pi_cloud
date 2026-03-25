package esprit.tn.backpi.controllers;

import esprit.tn.backpi.entities.Publication;
import esprit.tn.backpi.entities.PublicationType;
import esprit.tn.backpi.entities.User;
import esprit.tn.backpi.services.PublicationService;
import esprit.tn.backpi.services.FileStorageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;

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
    public List<Publication> getAllPublications() {
        return publicationService.getAllPublications();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Publication> getPublicationById(@PathVariable("id") Long id) {
        Publication publication = publicationService.getPublicationById(id);
        return publication != null ? ResponseEntity.ok(publication) : ResponseEntity.notFound().build();
    }

    @PostMapping(consumes = "multipart/form-data")
    public Publication createPublication(
            @RequestParam("content") String content,
            @RequestParam("authorId") Long authorId,
            @RequestParam("type") PublicationType type,
            @RequestParam(value = "file", required = false) MultipartFile file) {
            
        Publication publication = new Publication();
        publication.setContent(content);
        publication.setType(type);
        publication.setCreatedAt(Instant.now());
        
        User author = new User();
        author.setId(authorId);
        publication.setAuthor(author);
        
        if (file != null && !file.isEmpty()) {
            String filePath = fileStorageService.storeFile(file);
            publication.setMediaUrl(filePath);
            publication.setMimeType(file.getContentType());
        }
        
        return publicationService.createPublication(publication);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Publication> updatePublication(@PathVariable("id") Long id, @RequestBody Publication updatedPublication) {
        Publication publication = publicationService.updatePublication(id, updatedPublication);
        return publication != null ? ResponseEntity.ok(publication) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePublication(@PathVariable("id") Long id) {
        publicationService.deletePublication(id);
        return ResponseEntity.noContent().build();
    }
}
