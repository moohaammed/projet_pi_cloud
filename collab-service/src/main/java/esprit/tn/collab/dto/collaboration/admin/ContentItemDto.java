package esprit.tn.collab.dto.collaboration.admin;

import java.time.Instant;

public class ContentItemDto {
    private String id;
    private String type;          // "POST" or "MESSAGE"
    private String content;
    private String authorName;
    private Long authorId;
    private String groupName;
    private String groupId;
    private Instant createdAt;
    private boolean distressed;
    private String moderationStatus;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }
    public Long getAuthorId() { return authorId; }
    public void setAuthorId(Long authorId) { this.authorId = authorId; }
    public String getGroupName() { return groupName; }
    public void setGroupName(String groupName) { this.groupName = groupName; }
    public String getGroupId() { return groupId; }
    public void setGroupId(String groupId) { this.groupId = groupId; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public boolean isDistressed() { return distressed; }
    public void setDistressed(boolean distressed) { this.distressed = distressed; }
    public String getModerationStatus() { return moderationStatus; }
    public void setModerationStatus(String moderationStatus) { this.moderationStatus = moderationStatus; }
}
