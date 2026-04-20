package esprit.tn.education.dto;

import esprit.tn.education.entities.Activity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScoreStadeDto {
    private Long scoreQuiz;
    private Activity.Stade stadeQuiz;
    private List<Activity.Stade> completedStagesQuiz;
    
    private Long scoreGame;
    private Activity.Stade stadeGame;
    private List<Activity.Stade> completedStagesGame;
}
