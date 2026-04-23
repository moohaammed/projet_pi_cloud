package esprit.tn.education.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ProcessAnswerResponse {
    /** correct | partial | incorrect | silence */
    private String status;
    /** Gentle French feedback to be spoken by TTS */
    private String feedback;
    /** Hint text to be spoken on 2nd attempt (may be empty) */
    private String hint;
    /** Text of the next question (null if session is finished) */
    private String nextQuestion;
    /** True when all questions have been completed */
    private boolean sessionFinished;
    /** Summary sentences repeated at the end of the session */
    private List<String> finalSummary;
    /** Current question index (0-based) */
    private int currentQuestionIndex;
    /** Total number of questions */
    private int totalQuestions;
    /** Score breakdown — populated when sessionFinished = true */
    private int correctAnswers;
    private int partialAnswers;
    private int incorrectAnswers;
}
