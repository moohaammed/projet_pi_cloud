package esprit.tn.backpi.dto.collaboration;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

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
 
    public Long getParentMessageId() { return parentMessageId; }
    public void setParentMessageId(Long parentMessageId) { this.parentMessageId = parentMessageId; }
    
    private Long parentMessageId;
}
