package esprit.tn.backpi.dto.collaboration;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public class ChatGroupCreateDto {

    @NotBlank(message = "Group name cannot be empty")
    @Size(min = 3, max = 50, message = "Group name must be between 3 and 50 characters")
    private String name;

    @Size(max = 255, message = "Description is too long")
    private String description;

    private String theme;

    private List<Long> memberIds;

    public ChatGroupCreateDto() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getTheme() { return theme; }
    public void setTheme(String theme) { this.theme = theme; }

    public List<Long> getMemberIds() { return memberIds; }
    public void setMemberIds(List<Long> memberIds) { this.memberIds = memberIds; }
}
