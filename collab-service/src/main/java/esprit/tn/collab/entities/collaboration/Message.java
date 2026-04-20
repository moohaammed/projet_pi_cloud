package esprit.tn.collab.entities.collaboration;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "messages")
public class Message {

    @Id
    private String id;

    private String content;

    private List<String> mediaUrls = new ArrayList<>();

    private List<String> mimeTypes = new ArrayList<>();

    @Deprecated
    private String mediaUrl;

    @Deprecated
    private String mimeType;

    private Instant sentAt;

    private Long senderId;

    private Long receiverId;

    private String chatGroupId;

    private String parentMessageId;

    
    private String parentMessageContent;

    private String sharedPublicationId;

    private boolean isDistressed;

    private Double sentimentScore = 0.0;

    private boolean isPinned = false;

    private List<Long> viewedByUserIds = new ArrayList<>();

    private MessageType type = MessageType.TEXT;

    private String pollQuestion;

    private List<MessagePollOption> pollOptions = new ArrayList<>();

    public Message() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    
    public List<String> getMediaUrls() { return mediaUrls; }
    public void setMediaUrls(List<String> mediaUrls) { this.mediaUrls = mediaUrls; }
    public List<String> getMimeTypes() { return mimeTypes; }
    public void setMimeTypes(List<String> mimeTypes) { this.mimeTypes = mimeTypes; }
    
    @Deprecated
    public String getMediaUrl() { 
        return mediaUrls != null && !mediaUrls.isEmpty() ? mediaUrls.get(0) : mediaUrl; 
    }
    @Deprecated
    public void setMediaUrl(String mediaUrl) { 
        this.mediaUrl = mediaUrl;
        if (mediaUrl != null && !mediaUrl.isEmpty()) {
            if (this.mediaUrls == null) this.mediaUrls = new ArrayList<>();
            if (!this.mediaUrls.contains(mediaUrl)) this.mediaUrls.add(mediaUrl);
        }
    }
    @Deprecated
    public String getMimeType() { 
        return mimeTypes != null && !mimeTypes.isEmpty() ? mimeTypes.get(0) : mimeType; 
    }
    @Deprecated
    public void setMimeType(String mimeType) { 
        this.mimeType = mimeType;
        if (mimeType != null && !mimeType.isEmpty()) {
            if (this.mimeTypes == null) this.mimeTypes = new ArrayList<>();
            if (!this.mimeTypes.contains(mimeType)) this.mimeTypes.add(mimeType);
        }
    }
    public Instant getSentAt() { return sentAt; }
    public void setSentAt(Instant sentAt) { this.sentAt = sentAt; }
    public Long getSenderId() { return senderId; }
    public void setSenderId(Long senderId) { this.senderId = senderId; }
    public Long getReceiverId() { return receiverId; }
    public void setReceiverId(Long receiverId) { this.receiverId = receiverId; }
    public String getChatGroupId() { return chatGroupId; }
    public void setChatGroupId(String chatGroupId) { this.chatGroupId = chatGroupId; }
    public String getParentMessageId() { return parentMessageId; }
    public void setParentMessageId(String parentMessageId) { this.parentMessageId = parentMessageId; }
    public String getParentMessageContent() { return parentMessageContent; }
    public void setParentMessageContent(String parentMessageContent) { this.parentMessageContent = parentMessageContent; }
    public String getSharedPublicationId() { return sharedPublicationId; }
    public void setSharedPublicationId(String sharedPublicationId) { this.sharedPublicationId = sharedPublicationId; }
    public boolean isDistressed() { return isDistressed; }
    public void setDistressed(boolean distressed) { isDistressed = distressed; }
    public Double getSentimentScore() { return sentimentScore; }
    public void setSentimentScore(Double sentimentScore) { this.sentimentScore = sentimentScore; }
    public boolean isPinned() { return isPinned; }
    public void setPinned(boolean pinned) { isPinned = pinned; }
    public List<Long> getViewedByUserIds() { return viewedByUserIds; }
    public void setViewedByUserIds(List<Long> viewedByUserIds) { this.viewedByUserIds = viewedByUserIds; }
    public MessageType getType() { return type; }
    public void setType(MessageType type) { this.type = type; }
    public String getPollQuestion() { return pollQuestion; }
    public void setPollQuestion(String pollQuestion) { this.pollQuestion = pollQuestion; }
    public List<MessagePollOption> getPollOptions() { return pollOptions; }
    public void setPollOptions(List<MessagePollOption> pollOptions) { this.pollOptions = pollOptions; }
}
