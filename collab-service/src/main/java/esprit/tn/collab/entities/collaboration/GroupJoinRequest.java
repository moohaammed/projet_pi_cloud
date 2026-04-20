package esprit.tn.collab.entities.collaboration;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;

@Document(collection = "group_join_requests")
public class GroupJoinRequest {

    
    @Id
    private String id;

    
    private Long userId;

    
    private String groupId;

    
    private String groupName;

    
    private Long groupOwnerId;

    
    private JoinRequestStatus status = JoinRequestStatus.PENDING;

    
    private Instant createdAt = Instant.now();

    public GroupJoinRequest() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getGroupId() { return groupId; }
    public void setGroupId(String groupId) { this.groupId = groupId; }
    public String getGroupName() { return groupName; }
    public void setGroupName(String groupName) { this.groupName = groupName; }
    public Long getGroupOwnerId() { return groupOwnerId; }
    public void setGroupOwnerId(Long groupOwnerId) { this.groupOwnerId = groupOwnerId; }
    public JoinRequestStatus getStatus() { return status; }
    public void setStatus(JoinRequestStatus status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
