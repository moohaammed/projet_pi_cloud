package esprit.tn.backpi.entities.collaboration;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId; // The target user
    private String content;
    private String type; // e.g., "COMMENT", "CAREBOT", "GROUP_MESSAGE", "POST_PUBLISHED"
    @com.fasterxml.jackson.annotation.JsonProperty("isRead")
    private boolean isRead = false;
    private Instant createdAt = Instant.now();

    public Notification() {}

    public Notification(Long userId, String content, String type) {
        this.userId = userId;
        this.content = content;
        this.type = type;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public boolean isRead() { return isRead; }
    public void setRead(boolean read) { isRead = read; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
