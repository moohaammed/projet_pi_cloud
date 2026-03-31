package esprit.tn.backpi.dto.collaboration;

import java.time.Instant;

public class MessageResponseDto {

    private Long id;
    private String content;
    private String mediaUrl;
    private String mimeType;
    private Instant sentAt;
    
    private Long senderId;
    private String senderName;
    
    private Long receiverId;
    private Long chatGroupId;
    private Long parentMessageId;
    private String parentMessageContent;
    private String parentMessageSenderName;


    private boolean isDistressed;
    private Double sentimentScore;

    public MessageResponseDto() {}

    // Getters and Setters
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

    public String getSenderName() { return senderName; }
    public void setSenderName(String senderName) { this.senderName = senderName; }

    public Long getReceiverId() { return receiverId; }
    public void setReceiverId(Long receiverId) { this.receiverId = receiverId; }

    public Long getChatGroupId() { return chatGroupId; }
    public void setChatGroupId(Long chatGroupId) { this.chatGroupId = chatGroupId; }

    public boolean isDistressed() { return isDistressed; }
    public void setDistressed(boolean distressed) { isDistressed = distressed; }

    public Double getSentimentScore() { return sentimentScore; }
    public void setSentimentScore(Double sentimentScore) { this.sentimentScore = sentimentScore; }
 
    public Long getParentMessageId() { return parentMessageId; }
    public void setParentMessageId(Long parentMessageId) { this.parentMessageId = parentMessageId; }
 
    public String getParentMessageContent() { return parentMessageContent; }
    public void setParentMessageContent(String parentMessageContent) { this.parentMessageContent = parentMessageContent; }
 
    public String getParentMessageSenderName() { return parentMessageSenderName; }
    public void setParentMessageSenderName(String parentMessageSenderName) { this.parentMessageSenderName = parentMessageSenderName; }
}
