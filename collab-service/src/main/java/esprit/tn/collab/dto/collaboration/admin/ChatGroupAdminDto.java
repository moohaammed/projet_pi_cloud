package esprit.tn.collab.dto.collaboration.admin;

import esprit.tn.collab.entities.collaboration.GroupCategory;
import java.time.Instant;

public class ChatGroupAdminDto {
    private String id;
    private String name;
    private String description;
    private GroupCategory category;
    private int memberCount;
    private Instant createdAt;
    private String ownerName;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public GroupCategory getCategory() { return category; }
    public void setCategory(GroupCategory category) { this.category = category; }
    public int getMemberCount() { return memberCount; }
    public void setMemberCount(int memberCount) { this.memberCount = memberCount; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public String getOwnerName() { return ownerName; }
    public void setOwnerName(String ownerName) { this.ownerName = ownerName; }
}
