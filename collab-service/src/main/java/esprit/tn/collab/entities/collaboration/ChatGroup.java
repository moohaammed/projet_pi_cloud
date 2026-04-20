package esprit.tn.collab.entities.collaboration;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.TextIndexed;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Document(collection = "chat_groups")
public class ChatGroup {

    @Id
    private String id;

    @TextIndexed
    private String name;

    private GroupCategory category = GroupCategory.MIXED;

    @TextIndexed
    private String description;

    @TextIndexed
    private List<String> tags = new ArrayList<>();

    private String theme;

    private Instant createdAt;

    private Set<Long> memberIds = new HashSet<>();

    private Long ownerId;

    public ChatGroup() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public GroupCategory getCategory() { return category; }
    public void setCategory(GroupCategory category) { this.category = category; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }
    public String getTheme() { return theme; }
    public void setTheme(String theme) { this.theme = theme; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Set<Long> getMemberIds() { return memberIds; }
    public void setMemberIds(Set<Long> memberIds) { this.memberIds = memberIds; }
    public Long getOwnerId() { return ownerId; }
    public void setOwnerId(Long ownerId) { this.ownerId = ownerId; }

    private boolean isDefault = false;

    private String defaultForRole;

    public boolean isDefault() { return isDefault; }
    public void setDefault(boolean aDefault) { isDefault = aDefault; }
    public String getDefaultForRole() { return defaultForRole; }
    public void setDefaultForRole(String defaultForRole) { this.defaultForRole = defaultForRole; }
}
