package esprit.tn.backpi.dto.collaboration.admin;

import esprit.tn.backpi.entities.collaboration.GroupCategory;
import lombok.Data;

import java.time.Instant;

@Data
public class ChatGroupAdminDto {
    private Long id;
    private String name;
    private String description;
    private GroupCategory category;
    private int memberCount;
    private Instant createdAt;
    private String ownerName;
}
