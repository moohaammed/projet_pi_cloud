package esprit.tn.collab.entities.collaboration;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "app_guidance")
public class AppGuidance {

    
    @Id
    private String id;

    
    @Indexed(unique = true)
    private String pageName;

    
    private String pageLabel;

    
    private List<String> instructions = new ArrayList<>();

    
    private Instant updatedAt = Instant.now();

    
    private Long updatedByUserId;

    public AppGuidance() {}

    
    public AppGuidance(String pageName, String pageLabel, List<String> instructions) {
        this.pageName = pageName;
        this.pageLabel = pageLabel;
        this.instructions = instructions;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getPageName() { return pageName; }
    public void setPageName(String pageName) { this.pageName = pageName; }
    public String getPageLabel() { return pageLabel; }
    public void setPageLabel(String pageLabel) { this.pageLabel = pageLabel; }
    public List<String> getInstructions() { return instructions; }
    public void setInstructions(List<String> instructions) { this.instructions = instructions; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public Long getUpdatedByUserId() { return updatedByUserId; }
    public void setUpdatedByUserId(Long updatedByUserId) { this.updatedByUserId = updatedByUserId; }
}
