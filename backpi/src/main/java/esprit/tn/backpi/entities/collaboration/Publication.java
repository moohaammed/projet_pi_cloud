package esprit.tn.backpi.entities.collaboration;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.List;
import java.util.ArrayList;
import esprit.tn.backpi.entity.User;

@Entity
public class Publication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Lob
    private String content;

    private String mediaUrl;
    private String mimeType;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", columnDefinition = "VARCHAR(255)")
    private PublicationType type;

    private Instant createdAt;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;   // ← corrigé

    @OneToMany(mappedBy = "publication", cascade = CascadeType.ALL,
            orphanRemoval = true, fetch = FetchType.EAGER)
    private List<Comment> comments = new ArrayList<>();

    private boolean isDistressed;
    private Double sentimentScore = 0.0;
    private boolean anonymous;
    private String pollQuestion;
 
    @OneToMany(mappedBy = "publication", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<PublicationPollOption> pollOptions = new ArrayList<>();

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "group_id")
    private ChatGroup chatGroup;

    /** When type is EVENT: id in `events` table (education module). */
    @Column(name = "linked_event_id")
    private Long linkedEventId;

    @Enumerated(EnumType.STRING)
    @Column(name = "moderation_status", length = 32)
    private ModerationStatus moderationStatus = ModerationStatus.NONE;

    @Enumerated(EnumType.STRING)
    @Column(name = "moderation_reason", length = 32)
    private ModerationReason moderationReason;

    @Column(name = "moderation_flagged_at")
    private Instant moderationFlaggedAt;

    @Lob
    private String supportIds = "";

    public Publication() {}

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
    public User getAuthor() { return author; }           // ← corrigé
    public void setAuthor(User author) { this.author = author; }  // ← corrigé
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

    public ChatGroup getChatGroup() { return chatGroup; }
    public void setChatGroup(ChatGroup chatGroup) { this.chatGroup = chatGroup; }

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
