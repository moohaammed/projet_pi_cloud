package esprit.tn.backpi.dto;

import esprit.tn.backpi.entities.education.Activity;

public class ScoreStadeDto {
    private Long scoreQuiz;
    private Activity.Stade stadeQuiz;
    
    private Long scoreGame;
    private Activity.Stade stadeGame;

    public ScoreStadeDto() {}

    public ScoreStadeDto(Long scoreQuiz, Activity.Stade stadeQuiz, Long scoreGame, Activity.Stade stadeGame) {
        this.scoreQuiz = scoreQuiz;
        this.stadeQuiz = stadeQuiz;
        this.scoreGame = scoreGame;
        this.stadeGame = stadeGame;
    }

    public Long getScoreQuiz() { return scoreQuiz; }
    public void setScoreQuiz(Long scoreQuiz) { this.scoreQuiz = scoreQuiz; }

    public Activity.Stade getStadeQuiz() { return stadeQuiz; }
    public void setStadeQuiz(Activity.Stade stadeQuiz) { this.stadeQuiz = stadeQuiz; }

    public Long getScoreGame() { return scoreGame; }
    public void setScoreGame(Long scoreGame) { this.scoreGame = scoreGame; }

    public Activity.Stade getStadeGame() { return stadeGame; }
    public void setStadeGame(Activity.Stade stadeGame) { this.stadeGame = stadeGame; }
}
