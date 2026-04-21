package esprit.tn.collab.dto.collaboration;

public class VoicePromptRequestDto {

    
    private Long targetPatientId;

    
    private String message;

    
    private Long caregiverId;

    public VoicePromptRequestDto() {}

    public Long getTargetPatientId() { return targetPatientId; }
    public void setTargetPatientId(Long targetPatientId) { this.targetPatientId = targetPatientId; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Long getCaregiverId() { return caregiverId; }
    public void setCaregiverId(Long caregiverId) { this.caregiverId = caregiverId; }
}
