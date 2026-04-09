package esprit.tn.collab.entities.collaboration;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Document(collection = "chat_groups")
public class ChatGroup {

    @Id
    private String id;

    private String name;
    private GroupCategory category = GroupCategory.MIXED;
    private String description;
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
    public String getTheme() { return theme; }
    public void setTheme(String theme) { this.theme = theme; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Set<Long> getMemberIds() { return memberIds; }
    public void setMemberIds(Set<Long> memberIds) { this.memberIds = memberIds; }
    public Long getOwnerId() { return ownerId; }
    public void setOwnerId(Long ownerId) { this.ownerId = ownerId; }
}
