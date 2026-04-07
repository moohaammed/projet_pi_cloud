package esprit.tn.collab.dto.collaboration;

import java.time.Instant;

public class NotificationResponseDto {

    private Long id;
    private Long userId;
    private String content;
    private String type;
    private boolean isRead;
    private Instant createdAt;

    public NotificationResponseDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public boolean getIsRead() { return isRead; }
    public void setIsRead(boolean read) { isRead = read; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
