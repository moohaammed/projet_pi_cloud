package esprit.tn.collab.dto.collaboration;

import java.util.List;

public class GuidanceResponseDto {

    private String pageName;
    private String pageLabel;

    
    private List<String> instructions;

    
    private String fullScript;

    public GuidanceResponseDto() {}

    public String getPageName() { return pageName; }
    public void setPageName(String pageName) { this.pageName = pageName; }
    public String getPageLabel() { return pageLabel; }
    public void setPageLabel(String pageLabel) { this.pageLabel = pageLabel; }
    public List<String> getInstructions() { return instructions; }
    public void setInstructions(List<String> instructions) { this.instructions = instructions; }
    public String getFullScript() { return fullScript; }
    public void setFullScript(String fullScript) { this.fullScript = fullScript; }
}
