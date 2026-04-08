package esprit.tn.collab.dto.collaboration;

import esprit.tn.collab.entities.collaboration.MessageType;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.util.List;

public class MessageResponseDto {

    private String id;
    private String content;
    private String mediaUrl;
    private String mimeType;
    private Instant sentAt;
    private Long senderId;
    private String senderName;
    private Long receiverId;
    private String chatGroupId;
    private String parentMessageId;
    private String parentMessageContent;
    private String parentMessageSenderName;
    private PublicationResponseDto sharedPublication;
    private boolean isDistressed;
    private Double sentimentScore;
    @JsonProperty("isPinned")
    private boolean isPinned;
    private List<Long> viewedByUserIds;
    private MessageType type;
    private String pollQuestion;
    private List<PollOptionResponseDto> pollOptions;
    private boolean fromBot;

    public MessageResponseDto() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
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
    public String getChatGroupId() { return chatGroupId; }
    public void setChatGroupId(String chatGroupId) { this.chatGroupId = chatGroupId; }
    public boolean isDistressed() { return isDistressed; }
    public void setDistressed(boolean distressed) { isDistressed = distressed; }
    public Double getSentimentScore() { return sentimentScore; }
    public void setSentimentScore(Double sentimentScore) { this.sentimentScore = sentimentScore; }
    public boolean isPinned() { return isPinned; }
    public void setPinned(boolean pinned) { isPinned = pinned; }
    public List<Long> getViewedByUserIds() { return viewedByUserIds; }
    public void setViewedByUserIds(List<Long> viewedByUserIds) { this.viewedByUserIds = viewedByUserIds; }
    public String getParentMessageId() { return parentMessageId; }
    public void setParentMessageId(String parentMessageId) { this.parentMessageId = parentMessageId; }
    public String getParentMessageContent() { return parentMessageContent; }
    public void setParentMessageContent(String parentMessageContent) { this.parentMessageContent = parentMessageContent; }
    public String getParentMessageSenderName() { return parentMessageSenderName; }
    public void setParentMessageSenderName(String parentMessageSenderName) { this.parentMessageSenderName = parentMessageSenderName; }
    public PublicationResponseDto getSharedPublication() { return sharedPublication; }
    public void setSharedPublication(PublicationResponseDto sharedPublication) { this.sharedPublication = sharedPublication; }
    public MessageType getType() { return type; }
    public void setType(MessageType type) { this.type = type; }
    public String getPollQuestion() { return pollQuestion; }
    public void setPollQuestion(String pollQuestion) { this.pollQuestion = pollQuestion; }
    public List<PollOptionResponseDto> getPollOptions() { return pollOptions; }
    public void setPollOptions(List<PollOptionResponseDto> pollOptions) { this.pollOptions = pollOptions; }
    public boolean isFromBot() { return fromBot; }
    public void setFromBot(boolean fromBot) { this.fromBot = fromBot; }
}
