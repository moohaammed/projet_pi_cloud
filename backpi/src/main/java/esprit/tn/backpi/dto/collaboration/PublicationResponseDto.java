package esprit.tn.backpi.dto.collaboration;

import esprit.tn.backpi.entities.collaboration.PublicationType;
import java.time.Instant;
import java.util.List;

public class PublicationResponseDto {

    private Long id;
    private String content;
    private String mediaUrl;
    private String mimeType;
    private PublicationType type;
    private Instant createdAt;
    
    private Long authorId;
    private String authorName;
    
    private boolean isDistressed;
    private Double sentimentScore;
    
    private boolean anonymous;
    
    private List<CommentResponseDto> comments;

    public PublicationResponseDto() {}

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getMediaUrl() { return mediaUrl; }
    public void setMediaUrl(String mediaUrl) { this.mediaUrl = mediaUrl; }

    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }

    public PublicationType getType() { return type; }
    public void setType(PublicationType type) { this.type = type; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Long getAuthorId() { return authorId; }
    public void setAuthorId(Long authorId) { this.authorId = authorId; }

    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }

    public boolean isDistressed() { return isDistressed; }
    public void setDistressed(boolean distressed) { isDistressed = distressed; }

    public Double getSentimentScore() { return sentimentScore; }
    public void setSentimentScore(Double sentimentScore) { this.sentimentScore = sentimentScore; }

    public boolean isAnonymous() { return anonymous; }
    public void setAnonymous(boolean anonymous) { this.anonymous = anonymous; }

    public List<CommentResponseDto> getComments() { return comments; }
    public void setComments(List<CommentResponseDto> comments) { this.comments = comments; }
}
