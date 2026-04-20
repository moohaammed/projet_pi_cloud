package esprit.tn.collab.dto.collaboration;

import java.util.List;

public class SearchResponseDto {

    private String id;
    private String type; // "POST" | "GROUP"
    private String title; // ChatGroup Name
    private String snippet; // Publication content or ChatGroup description
    private String mediaUrl;
    private List<String> tags;
    private Double matchScore; // Relevance approximation

    public SearchResponseDto() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getSnippet() { return snippet; }
    public void setSnippet(String snippet) { this.snippet = snippet; }
    public String getMediaUrl() { return mediaUrl; }
    public void setMediaUrl(String mediaUrl) { this.mediaUrl = mediaUrl; }
    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }
    public Double getMatchScore() { return matchScore; }
    public void setMatchScore(Double matchScore) { this.matchScore = matchScore; }
}
