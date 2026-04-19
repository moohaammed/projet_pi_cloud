package esprit.tn.collab.dto.collaboration.admin;

import esprit.tn.collab.entities.collaboration.ModerationReason;
import esprit.tn.collab.entities.collaboration.PublicationType;
import java.time.Instant;

public class ModerationQueueItemDto {
    private String publicationId;
    private String authorName;
    private Long authorId;
    private String contentPreview;
    private ModerationReason reason;
    private Instant flaggedAt;
    private PublicationType type;

    public String getPublicationId() { return publicationId; }
    public void setPublicationId(String publicationId) { this.publicationId = publicationId; }
    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }
    public Long getAuthorId() { return authorId; }
    public void setAuthorId(Long authorId) { this.authorId = authorId; }
    public String getContentPreview() { return contentPreview; }
    public void setContentPreview(String contentPreview) { this.contentPreview = contentPreview; }
    public ModerationReason getReason() { return reason; }
    public void setReason(ModerationReason reason) { this.reason = reason; }
    public Instant getFlaggedAt() { return flaggedAt; }
    public void setFlaggedAt(Instant flaggedAt) { this.flaggedAt = flaggedAt; }
    public PublicationType getType() { return type; }
    public void setType(PublicationType type) { this.type = type; }
}
