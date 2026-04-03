package esprit.tn.backpi.entities.collaboration;
 
import esprit.tn.backpi.entities.User;
import jakarta.persistence.*;
import java.time.Instant;
 
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
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "sender_id")
    private User sender;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "receiver_id")
    private User receiver;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "group_id")
    private ChatGroup chatGroup;
 
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Message parentMessage;
 
    private boolean isDistressed;
 
    private Double sentimentScore = 0.0;
 
    private boolean isPinned = false;
 
    @ElementCollection
    private java.util.List<Long> viewedByUserIds = new java.util.ArrayList<>();
 
    @Enumerated(EnumType.STRING)
    private MessageType type = MessageType.TEXT;
 
    private String pollQuestion;
 
    @OneToMany(mappedBy = "message", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private java.util.List<MessagePollOption> pollOptions = new java.util.ArrayList<>();
 
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
 
    public User getSender() { return sender; }
    public void setSender(User sender) { this.sender = sender; }
 
    public User getReceiver() { return receiver; }
    public void setReceiver(User receiver) { this.receiver = receiver; }
 
    public ChatGroup getChatGroup() { return chatGroup; }
    public void setChatGroup(ChatGroup chatGroup) { this.chatGroup = chatGroup; }
 
    public boolean isDistressed() { return isDistressed; }
    public void setDistressed(boolean distressed) { isDistressed = distressed; }
 
    public Double getSentimentScore() { return sentimentScore; }
    public void setSentimentScore(Double sentimentScore) { this.sentimentScore = sentimentScore; }
 
    public boolean isPinned() { return isPinned; }
    public void setPinned(boolean pinned) { isPinned = pinned; }
 
    public java.util.List<Long> getViewedByUserIds() { return viewedByUserIds; }
    public void setViewedByUserIds(java.util.List<Long> viewedByUserIds) { this.viewedByUserIds = viewedByUserIds; }
 
    public Message getParentMessage() { return parentMessage; }
    public void setParentMessage(Message parentMessage) { this.parentMessage = parentMessage; }
 
    public MessageType getType() { return type; }
    public void setType(MessageType type) { this.type = type; }
 
    public String getPollQuestion() { return pollQuestion; }
    public void setPollQuestion(String pollQuestion) { this.pollQuestion = pollQuestion; }
 
    public java.util.List<MessagePollOption> getPollOptions() { return pollOptions; }
    public void setPollOptions(java.util.List<MessagePollOption> pollOptions) { this.pollOptions = pollOptions; }
}
