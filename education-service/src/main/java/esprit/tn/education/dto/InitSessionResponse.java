package esprit.tn.education.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class InitSessionResponse {
    private String sessionId;
    private List<String> summary;
    /** Text of the first question that the AI will ask */
    private String firstQuestion;
    private int totalQuestions;
}
