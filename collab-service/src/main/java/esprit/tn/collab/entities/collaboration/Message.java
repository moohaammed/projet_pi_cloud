package esprit.tn.collab.entities.collaboration;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Lob
    private String content;

    private String mediaUrl;
    private String mimeType;
    private Instant sentAt;

    /** userId only — no JPA join to User */
    @Column(name = "sender_id")
    private Long senderId;

    @Column(name = "receiver_id")
    private Long receiverId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "group_id")
    private ChatGroup chatGroup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Message parentMessage;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "shared_publication_id")
    private Publication sharedPublication;

    private boolean isDistressed;
    private Double sentimentScore = 0.0;
    private boolean isPinned = false;

    @ElementCollection
    private List<Long> viewedByUserIds = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "type", columnDefinition = "VARCHAR(255)")
    private MessageType type = MessageType.TEXT;

    private String pollQuestion;

    @OneToMany(mappedBy = "message", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<MessagePollOption> pollOptions = new ArrayList<>();

    public Message() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getMediaUrl() { return mediaUrl; }
    public void setMediaUrl(String mediaUrl) { this.mediaUrl = mediaUrl; }
    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }
    public Instant getSentAt() { return sentAt; }
    public void setSentAt(Instant sentAt) { this.sentAt = sentAt; }
    public Long getSenderId() { return senderId; }
    public void setSenderId(Long senderId) { this.senderId = senderId; }
    public Long getReceiverId() { return receiverId; }
    public void setReceiverId(Long receiverId) { this.receiverId = receiverId; }
    public ChatGroup getChatGroup() { return chatGroup; }
    public void setChatGroup(ChatGroup chatGroup) { this.chatGroup = chatGroup; }
    public boolean isDistressed() { return isDistressed; }
    public void setDistressed(boolean distressed) { isDistressed = distressed; }
    public Double getSentimentScore() { return sentimentScore; }
    public void setSentimentScore(Double sentimentScore) { this.sentimentScore = sentimentScore; }
    public boolean isPinned() { return isPinned; }
    public void setPinned(boolean pinned) { isPinned = pinned; }
    public List<Long> getViewedByUserIds() { return viewedByUserIds; }
    public void setViewedByUserIds(List<Long> viewedByUserIds) { this.viewedByUserIds = viewedByUserIds; }
    public Message getParentMessage() { return parentMessage; }
    public void setParentMessage(Message parentMessage) { this.parentMessage = parentMessage; }
    public Publication getSharedPublication() { return sharedPublication; }
    public void setSharedPublication(Publication sharedPublication) { this.sharedPublication = sharedPublication; }
    public MessageType getType() { return type; }
    public void setType(MessageType type) { this.type = type; }
    public String getPollQuestion() { return pollQuestion; }
    public void setPollQuestion(String pollQuestion) { this.pollQuestion = pollQuestion; }
    public List<MessagePollOption> getPollOptions() { return pollOptions; }
    public void setPollOptions(List<MessagePollOption> pollOptions) { this.pollOptions = pollOptions; }
}
