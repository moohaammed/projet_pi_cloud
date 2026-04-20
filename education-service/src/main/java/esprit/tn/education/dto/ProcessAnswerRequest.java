package esprit.tn.education.dto;

import lombok.Data;

@Data
public class ProcessAnswerRequest {
    /** The transcribed patient answer (may be empty string for silence) */
    private String answerText;
}
