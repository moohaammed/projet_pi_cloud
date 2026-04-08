package esprit.tn.collab.entities.collaboration;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "publications")
public class Publication {

    @Id
    private String id;

    private String content;
    private String mediaUrl;
    private String mimeType;
    private PublicationType type;
    private Instant createdAt;
    private Long authorId;

    /** Embedded comments */
    private List<Comment> comments = new ArrayList<>();

    private boolean isDistressed;
    private Double sentimentScore = 0.0;
    private boolean anonymous;
    private String pollQuestion;

    /** Embedded poll options */
    private List<PublicationPollOption> pollOptions = new ArrayList<>();

    /** Reference to group by String id */
    private String chatGroupId;
    private String chatGroupName;

    private Long linkedEventId;
    private ModerationStatus moderationStatus = ModerationStatus.NONE;
    private ModerationReason moderationReason;
    private Instant moderationFlaggedAt;
    private String supportIds = "";

    public Publication() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
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
    public List<Comment> getComments() { return comments; }
    public void setComments(List<Comment> comments) { this.comments = comments; }
    public boolean isDistressed() { return isDistressed; }
    public void setDistressed(boolean distressed) { isDistressed = distressed; }
    public Double getSentimentScore() { return sentimentScore; }
    public void setSentimentScore(Double sentimentScore) { this.sentimentScore = sentimentScore; }
    public boolean isAnonymous() { return anonymous; }
    public void setAnonymous(boolean anonymous) { this.anonymous = anonymous; }
    public String getPollQuestion() { return pollQuestion; }
    public void setPollQuestion(String pollQuestion) { this.pollQuestion = pollQuestion; }
    public List<PublicationPollOption> getPollOptions() { return pollOptions; }
    public void setPollOptions(List<PublicationPollOption> pollOptions) { this.pollOptions = pollOptions; }
    public String getChatGroupId() { return chatGroupId; }
    public void setChatGroupId(String chatGroupId) { this.chatGroupId = chatGroupId; }
    public String getChatGroupName() { return chatGroupName; }
    public void setChatGroupName(String chatGroupName) { this.chatGroupName = chatGroupName; }
    // Compatibility helpers used by services
    public ChatGroup getChatGroup() { return null; } // not used in MongoDB version
    public void setChatGroup(ChatGroup g) { if (g != null) { this.chatGroupId = g.getId(); this.chatGroupName = g.getName(); } }
    public Long getLinkedEventId() { return linkedEventId; }
    public void setLinkedEventId(Long linkedEventId) { this.linkedEventId = linkedEventId; }
    public ModerationStatus getModerationStatus() { return moderationStatus; }
    public void setModerationStatus(ModerationStatus moderationStatus) { this.moderationStatus = moderationStatus; }
    public ModerationReason getModerationReason() { return moderationReason; }
    public void setModerationReason(ModerationReason moderationReason) { this.moderationReason = moderationReason; }
    public Instant getModerationFlaggedAt() { return moderationFlaggedAt; }
    public void setModerationFlaggedAt(Instant moderationFlaggedAt) { this.moderationFlaggedAt = moderationFlaggedAt; }
    public String getSupportIds() { return supportIds != null ? supportIds : ""; }
    public void setSupportIds(String supportIds) { this.supportIds = supportIds; }
}
