package esprit.tn.collab.dto.collaboration;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public class ChatGroupCreateDto {

    @NotBlank
    @Size(min = 3, max = 50)
    private String name;

    @Size(max = 255)
    private String description;

    private String theme;
    private List<Long> memberIds;
    private Long ownerId;
    private List<String> tags;
    @com.fasterxml.jackson.annotation.JsonProperty("isDefault")
    private boolean isDefault = false;
    private String defaultForRole;

    public ChatGroupCreateDto() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getTheme() { return theme; }
    public void setTheme(String theme) { this.theme = theme; }
    public List<Long> getMemberIds() { return memberIds; }
    public void setMemberIds(List<Long> memberIds) { this.memberIds = memberIds; }
    public Long getOwnerId() { return ownerId; }
    public void setOwnerId(Long ownerId) { this.ownerId = ownerId; }
    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }
    public boolean isDefault() { return isDefault; }
    public void setDefault(boolean aDefault) { isDefault = aDefault; }
    public String getDefaultForRole() { return defaultForRole; }
    public void setDefaultForRole(String defaultForRole) { this.defaultForRole = defaultForRole; }
}
