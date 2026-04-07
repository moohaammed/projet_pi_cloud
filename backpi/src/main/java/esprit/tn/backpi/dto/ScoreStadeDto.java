package esprit.tn.backpi.dto;

import esprit.tn.backpi.entities.education.Activity;
import java.util.List;

public class ScoreStadeDto {
    private Long scoreQuiz;
    private Activity.Stade stadeQuiz;
    private List<Activity.Stade> completedStagesQuiz;
    
    private Long scoreGame;
    private Activity.Stade stadeGame;
    private List<Activity.Stade> completedStagesGame;

    public ScoreStadeDto() {}

    public ScoreStadeDto(Long scoreQuiz, Activity.Stade stadeQuiz, List<Activity.Stade> completedStagesQuiz,
                        Long scoreGame, Activity.Stade stadeGame, List<Activity.Stade> completedStagesGame) {
        this.scoreQuiz = scoreQuiz;
        this.stadeQuiz = stadeQuiz;
        this.completedStagesQuiz = completedStagesQuiz;
        this.scoreGame = scoreGame;
        this.stadeGame = stadeGame;
        this.completedStagesGame = completedStagesGame;
    }

    public Long getScoreQuiz() { return scoreQuiz; }
    public void setScoreQuiz(Long scoreQuiz) { this.scoreQuiz = scoreQuiz; }

    public Activity.Stade getStadeQuiz() { return stadeQuiz; }
    public void setStadeQuiz(Activity.Stade stadeQuiz) { this.stadeQuiz = stadeQuiz; }

    public List<Activity.Stade> getCompletedStagesQuiz() { return completedStagesQuiz; }
    public void setCompletedStagesQuiz(List<Activity.Stade> completedStagesQuiz) { this.completedStagesQuiz = completedStagesQuiz; }

    public Long getScoreGame() { return scoreGame; }
    public void setScoreGame(Long scoreGame) { this.scoreGame = scoreGame; }

    public Activity.Stade getStadeGame() { return stadeGame; }
    public void setStadeGame(Activity.Stade stadeGame) { this.stadeGame = stadeGame; }

    public List<Activity.Stade> getCompletedStagesGame() { return completedStagesGame; }
    public void setCompletedStagesGame(List<Activity.Stade> completedStagesGame) { this.completedStagesGame = completedStagesGame; }
}
