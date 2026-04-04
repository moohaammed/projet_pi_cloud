package esprit.tn.backpi.dto.collaboration;
 
import esprit.tn.backpi.entities.collaboration.PublicationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
 
import java.util.List;
 
public class PublicationCreateDto {
 
    @NotBlank(message = "Publication content cannot be empty")
    @Size(max = 5000, message = "Publication content is too long")
    private String content;
 
    private PublicationType type;
 
    @NotNull(message = "Author ID is required")
    private Long authorId;
 
    private boolean anonymous;
 
    private String pollQuestion;
    private List<String> pollOptions;
 
    public PublicationCreateDto() {}
 
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
 
    public PublicationType getType() { return type; }
    public void setType(PublicationType type) { this.type = type; }
 
    public Long getAuthorId() { return authorId; }
    public void setAuthorId(Long authorId) { this.authorId = authorId; }
 
    public boolean isAnonymous() { return anonymous; }
    public void setAnonymous(boolean anonymous) { this.anonymous = anonymous; }
 
    public String getPollQuestion() { return pollQuestion; }
    public void setPollQuestion(String pollQuestion) { this.pollQuestion = pollQuestion; }
 
    public List<String> getPollOptions() { return pollOptions; }
    public void setPollOptions(List<String> pollOptions) { this.pollOptions = pollOptions; }
}
