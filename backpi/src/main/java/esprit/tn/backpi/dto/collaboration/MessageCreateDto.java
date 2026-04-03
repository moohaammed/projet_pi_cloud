package esprit.tn.backpi.dto.collaboration;

import esprit.tn.backpi.entities.collaboration.MessageType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public class MessageCreateDto {

    @NotBlank(message = "Message content cannot be empty")
    @Size(max = 2000, message = "Message content is too long")
    private String content;

    @NotNull(message = "Sender ID is required")
    private Long senderId;

    private Long receiverId;
    private Long chatGroupId;

    public MessageCreateDto() {}

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public Long getSenderId() { return senderId; }
    public void setSenderId(Long senderId) { this.senderId = senderId; }

    public Long getReceiverId() { return receiverId; }
    public void setReceiverId(Long receiverId) { this.receiverId = receiverId; }

    public Long getChatGroupId() { return chatGroupId; }
    public void setChatGroupId(Long chatGroupId) { this.chatGroupId = chatGroupId; }
 
    private MessageType type;
    private String pollQuestion;
    private java.util.List<String> pollOptions;

    public MessageType getType() { return type; }
    public void setType(MessageType type) { this.type = type; }

    public String getPollQuestion() { return pollQuestion; }
    public void setPollQuestion(String pollQuestion) { this.pollQuestion = pollQuestion; }

    public java.util.List<String> getPollOptions() { return pollOptions; }
    public void setPollOptions(java.util.List<String> pollOptions) { this.pollOptions = pollOptions; }

    public Long getParentMessageId() { return parentMessageId; }
    public void setParentMessageId(Long parentMessageId) { this.parentMessageId = parentMessageId; }

    private Long parentMessageId;
}
