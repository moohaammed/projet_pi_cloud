package esprit.tn.collab.dto.collaboration;

import esprit.tn.collab.entities.collaboration.PublicationType;
import java.time.Instant;
import java.util.List;

public class PublicationResponseDto {

    private String id;
    private String content;
    
    // Multi-media support
    private List<String> mediaUrls;
    private List<String> mimeTypes;
    
    // Legacy single media (backward compatibility)
    private String mediaUrl;
    private String mimeType;
    
    private PublicationType type;
    private Instant createdAt;
    private Long authorId;
    private String authorName;
    private boolean isDistressed;
    private Double sentimentScore;
    private boolean anonymous;
    private List<String> tags;
    private String pollQuestion;
    private List<PollOptionResponseDto> pollOptions;
    private String groupId;
    private String groupName;
    private Long linkedEventId;
    private SharedEventPreviewDto linkedEvent;
    private List<CommentResponseDto> comments;
    private int commentCount;
    private int shareCount;
    private int supportCount;
    private String supportIds;

    public PublicationResponseDto() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    
    public List<String> getMediaUrls() { return mediaUrls; }
    public void setMediaUrls(List<String> mediaUrls) { this.mediaUrls = mediaUrls; }
    public List<String> getMimeTypes() { return mimeTypes; }
    public void setMimeTypes(List<String> mimeTypes) { this.mimeTypes = mimeTypes; }
    
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
    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }
    public String getPollQuestion() { return pollQuestion; }
    public void setPollQuestion(String pollQuestion) { this.pollQuestion = pollQuestion; }
    public List<PollOptionResponseDto> getPollOptions() { return pollOptions; }
    public void setPollOptions(List<PollOptionResponseDto> pollOptions) { this.pollOptions = pollOptions; }
    public List<CommentResponseDto> getComments() { return comments; }
    public void setComments(List<CommentResponseDto> comments) { this.comments = comments; }
    public int getCommentCount() { return commentCount; }
    public void setCommentCount(int commentCount) { this.commentCount = commentCount; }
    public int getShareCount() { return shareCount; }
    public void setShareCount(int shareCount) { this.shareCount = shareCount; }
    public int getSupportCount() { return supportCount; }
    public void setSupportCount(int supportCount) { this.supportCount = supportCount; }
    public String getSupportIds() { return supportIds; }
    public void setSupportIds(String supportIds) { this.supportIds = supportIds; }
    public String getGroupId() { return groupId; }
    public void setGroupId(String groupId) { this.groupId = groupId; }
    public String getGroupName() { return groupName; }
    public void setGroupName(String groupName) { this.groupName = groupName; }
    public Long getLinkedEventId() { return linkedEventId; }
    public void setLinkedEventId(Long linkedEventId) { this.linkedEventId = linkedEventId; }
    public SharedEventPreviewDto getLinkedEvent() { return linkedEvent; }
    public void setLinkedEvent(SharedEventPreviewDto linkedEvent) { this.linkedEvent = linkedEvent; }
}
