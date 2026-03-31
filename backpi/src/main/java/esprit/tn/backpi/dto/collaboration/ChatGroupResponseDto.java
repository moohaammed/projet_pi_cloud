package esprit.tn.backpi.dto.collaboration;

import java.time.Instant;
import java.util.List;

public class ChatGroupResponseDto {

    private Long id;
    private String name;
    private String description;
    private String theme;
    private Instant createdAt;
    
    private List<MemberDto> members;

    public ChatGroupResponseDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getTheme() { return theme; }
    public void setTheme(String theme) { this.theme = theme; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public List<MemberDto> getMembers() { return members; }
    public void setMembers(List<MemberDto> members) { this.members = members; }
}
