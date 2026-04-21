package esprit.tn.collab.controllers.collaboration;

import esprit.tn.collab.dto.collaboration.SearchResponseDto;
import esprit.tn.collab.services.collaboration.GlobalSearchService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/collab/search")
public class SearchController {

    private final GlobalSearchService globalSearchService;

    public SearchController(GlobalSearchService globalSearchService) {
        this.globalSearchService = globalSearchService;
    }

    @GetMapping
    public ResponseEntity<List<SearchResponseDto>> searchGlobally(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) List<String> tags) {

        List<SearchResponseDto> results = globalSearchService.searchGlobal(q, tags, userId);
        return ResponseEntity.ok(results);
    }
}
