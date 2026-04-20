package esprit.tn.collab.services.collaboration;

import esprit.tn.collab.dto.collaboration.SearchResponseDto;
import esprit.tn.collab.entities.collaboration.ChatGroup;
import esprit.tn.collab.entities.collaboration.Publication;
import esprit.tn.collab.entities.collaboration.PublicationType;
import esprit.tn.collab.repositories.collaboration.ChatGroupRepository;
import esprit.tn.collab.repositories.collaboration.PublicationRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class GlobalSearchService {

    private final PublicationRepository publicationRepository;
    private final ChatGroupRepository chatGroupRepository;

    public GlobalSearchService(PublicationRepository publicationRepository, ChatGroupRepository chatGroupRepository) {
        this.publicationRepository = publicationRepository;
        this.chatGroupRepository = chatGroupRepository;
    }

    public List<SearchResponseDto> searchGlobal(String query, List<String> tags, Long userId) {
        List<SearchResponseDto> results = new ArrayList<>();

        // Collect all group IDs the user is a member of
        List<String> userGroupIds = new ArrayList<>();
        if (userId != null) {
            chatGroupRepository.findByMembersId(userId).forEach(g -> userGroupIds.add(g.getId()));
        }

        if (tags != null && !tags.isEmpty()) {
            // Search strictly by tags
            List<Publication> pubs = publicationRepository.findByTagsIn(tags, userGroupIds);
            List<ChatGroup> groups = chatGroupRepository.findByTagsIn(tags);
            
            pubs.forEach(p -> results.add(map(p, 10.0))); // Perfect tag match
            groups.forEach(g -> results.add(map(g, 10.0)));
        } else if (query != null && !query.trim().isEmpty()) {
            String q = query.trim();
            
            // 1. Native MongoDB $text search (Strict, exact word matching leveraging index)
            List<Publication> pubs = publicationRepository.searchByText(q, userGroupIds);
            List<ChatGroup> groups = chatGroupRepository.searchByText(q);
            
            // Apply high score
            pubs.forEach(p -> results.add(map(p, 5.0)));
            groups.forEach(g -> results.add(map(g, 5.0)));

            // 2. Fuzzy Matching fallback via $regex
            // (If the user mispelled something like 'Alzhimer', $text will return 0 results)
            if (pubs.isEmpty() && groups.isEmpty()) {
                List<Publication> fuzzyPubs = publicationRepository.searchByRegex(".*" + q + ".*", userGroupIds);
                List<ChatGroup> fuzzyGroups = chatGroupRepository.searchByRegex(".*" + q + ".*");
                
                fuzzyPubs.forEach(p -> results.add(map(p, 2.5))); // Lower score for fuzzy
                fuzzyGroups.forEach(g -> results.add(map(g, 2.5)));
            }
        }

        // Remove duplicates and sort by relevance score descending
        results.sort(Comparator.comparing(SearchResponseDto::getMatchScore).reversed());
        return results;
    }

    private SearchResponseDto map(Publication p, double score) {
        SearchResponseDto dto = new SearchResponseDto();
        dto.setId(p.getId());
        dto.setType("POST");
        dto.setTitle(p.getType() == PublicationType.VOTE ? p.getPollQuestion() : "Community Post");
        
        String snippet = p.getContent() != null ? p.getContent() : "";
        if (snippet.length() > 100) snippet = snippet.substring(0, 100) + "...";
        dto.setSnippet(snippet);
        
        dto.setMediaUrl(p.getMediaUrl());
        dto.setTags(p.getTags() != null ? p.getTags() : new ArrayList<>());
        dto.setMatchScore(score);
        return dto;
    }

    private SearchResponseDto map(ChatGroup g, double score) {
        SearchResponseDto dto = new SearchResponseDto();
        dto.setId(g.getId());
        dto.setType("GROUP");
        dto.setTitle(g.getName());
        
        String snippet = g.getDescription() != null ? g.getDescription() : "";
        if (snippet.length() > 100) snippet = snippet.substring(0, 100) + "...";
        dto.setSnippet(snippet);
        
        dto.setMediaUrl(null); // Groups don't have banner images yet
        dto.setTags(g.getTags() != null ? g.getTags() : new ArrayList<>());
        dto.setMatchScore(score);
        return dto;
    }
}
