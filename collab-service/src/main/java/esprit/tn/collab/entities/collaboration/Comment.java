package esprit.tn.collab.entities.collaboration;

import java.time.Instant;

/** Embedded document inside Publication */
public class Comment {

    private String id;
    private String content;
    private Instant createdAt;
    private Long authorId;

    public Comment() {
        this.id = new org.bson.types.ObjectId().toHexString();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Long getAuthorId() { return authorId; }
    public void setAuthorId(Long authorId) { this.authorId = authorId; }
    public void setPublication(Publication p) {} // no-op
    public Publication getPublication() { return null; }
}
