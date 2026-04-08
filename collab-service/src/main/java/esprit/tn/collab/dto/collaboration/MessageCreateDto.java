package esprit.tn.collab.dto.collaboration;

import esprit.tn.collab.entities.collaboration.MessageType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public class MessageCreateDto {

    @Size(max = 2000)
    private String content;

    @NotNull(message = "Sender ID is required")
    private Long senderId;

    private Long receiverId;
    private String chatGroupId;       // MongoDB String id
    private MessageType type;
    private String pollQuestion;
    private List<String> pollOptions;
    private String parentMessageId;   // MongoDB String id
    private String sharedPublicationId; // MongoDB String id

    public MessageCreateDto() {}

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public Long getSenderId() { return senderId; }
    public void setSenderId(Long senderId) { this.senderId = senderId; }
    public Long getReceiverId() { return receiverId; }
    public void setReceiverId(Long receiverId) { this.receiverId = receiverId; }
    public String getChatGroupId() { return chatGroupId; }
    public void setChatGroupId(String chatGroupId) { this.chatGroupId = chatGroupId; }
    public MessageType getType() { return type; }
    public void setType(MessageType type) { this.type = type; }
    public String getPollQuestion() { return pollQuestion; }
    public void setPollQuestion(String pollQuestion) { this.pollQuestion = pollQuestion; }
    public List<String> getPollOptions() { return pollOptions; }
    public void setPollOptions(List<String> pollOptions) { this.pollOptions = pollOptions; }
    public String getParentMessageId() { return parentMessageId; }
    public void setParentMessageId(String parentMessageId) { this.parentMessageId = parentMessageId; }
    public String getSharedPublicationId() { return sharedPublicationId; }
    public void setSharedPublicationId(String sharedPublicationId) { this.sharedPublicationId = sharedPublicationId; }
}
