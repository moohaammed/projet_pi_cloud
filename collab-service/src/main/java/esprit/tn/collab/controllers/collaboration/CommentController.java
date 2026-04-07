package esprit.tn.collab.controllers.collaboration;

import esprit.tn.collab.dto.collaboration.CommentCreateDto;
import esprit.tn.collab.dto.collaboration.CommentResponseDto;
import esprit.tn.collab.services.collaboration.CommentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/comments")
@CrossOrigin(origins = "http://localhost:4200")
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) { this.commentService = commentService; }

    @GetMapping("/publication/{publicationId}")
    public List<CommentResponseDto> getCommentsByPublication(@PathVariable Long publicationId) { return commentService.getCommentsByPublication(publicationId); }

    @PostMapping
    public CommentResponseDto createComment(@Valid @RequestBody CommentCreateDto dto) { return commentService.createComment(dto); }

    @PutMapping("/{id}")
    public ResponseEntity<CommentResponseDto> updateComment(@PathVariable Long id, @Valid @RequestBody CommentCreateDto dto) {
        CommentResponseDto c = commentService.updateComment(id, dto);
        return c != null ? ResponseEntity.ok(c) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteComment(@PathVariable Long id) { commentService.deleteComment(id); return ResponseEntity.noContent().build(); }
}
