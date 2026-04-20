package esprit.tn.education.entities;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AudioQuestion {

    private String questionText;
    private String expectedAnswer;
    private String patientAnswer;

    /**
     * Result of the AI analysis: correct, partial, incorrect, silence
     */
    private String analysisStatus;

    private String feedbackText;
    private String hintText;

    /** Number of attempts (max 3) */
    @Builder.Default
    private int attempts = 0;

    @Builder.Default
    private boolean completed = false;

    /** True once key info has been reinforced (on 3rd failed attempt) */
    @Builder.Default
    private boolean keyInfoReinforced = false;
}
