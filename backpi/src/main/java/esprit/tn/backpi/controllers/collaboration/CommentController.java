package esprit.tn.backpi.controllers.collaboration;

import esprit.tn.backpi.dto.collaboration.CommentCreateDto;
import esprit.tn.backpi.dto.collaboration.CommentResponseDto;
import esprit.tn.backpi.services.collaboration.CommentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/comments")
@CrossOrigin(origins = "http://localhost:4200")
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    @GetMapping("/publication/{publicationId}")
    public List<CommentResponseDto> getCommentsByPublication(@PathVariable("publicationId") Long publicationId) {
        return commentService.getCommentsByPublication(publicationId);
    }

    @PostMapping
    public CommentResponseDto createComment(@Valid @RequestBody CommentCreateDto dto) {
        return commentService.createComment(dto);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CommentResponseDto> updateComment(@PathVariable("id") Long id, @Valid @RequestBody CommentCreateDto dto) {
        CommentResponseDto comment = commentService.updateComment(id, dto);
        return comment != null ? ResponseEntity.ok(comment) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteComment(@PathVariable("id") Long id) {
        commentService.deleteComment(id);
        return ResponseEntity.noContent().build();
    }
}
