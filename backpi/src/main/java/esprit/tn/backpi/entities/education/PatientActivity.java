package esprit.tn.backpi.entities.education;

import esprit.tn.backpi.entity.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "patient_activity")
public class PatientActivity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "activity_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Activity activity;

    private Long scoreCumule = 0L;
    private Long scoreSession = 0L;

    private Integer bonnesReponses = 0;
    private Integer mauvaisesReponses = 0;

    private Boolean reussi = false;

    @Enumerated(EnumType.STRING)
    private Activity.Stade currentStade = Activity.Stade.LEGER;

    private Integer dureeSecondes = 0;

    private LocalDateTime playedAt;

    @PrePersist
    public void prePersist() {
        if (this.playedAt == null) {
            this.playedAt = LocalDateTime.now();
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Activity getActivity() { return activity; }
    public void setActivity(Activity activity) { this.activity = activity; }

    public Long getScoreCumule() { return scoreCumule; }
    public void setScoreCumule(Long scoreCumule) { this.scoreCumule = scoreCumule; }

    public Long getScoreSession() { return scoreSession; }
    public void setScoreSession(Long scoreSession) { this.scoreSession = scoreSession; }

    public Integer getBonnesReponses() { return bonnesReponses; }
    public void setBonnesReponses(Integer bonnesReponses) { this.bonnesReponses = bonnesReponses; }

    public Integer getMauvaisesReponses() { return mauvaisesReponses; }
    public void setMauvaisesReponses(Integer mauvaisesReponses) { this.mauvaisesReponses = mauvaisesReponses; }

    public Boolean getReussi() { return reussi; }
    public void setReussi(Boolean reussi) { this.reussi = reussi; }

    public Activity.Stade getCurrentStade() { return currentStade; }
    public void setCurrentStade(Activity.Stade currentStade) { this.currentStade = currentStade; }

    public Integer getDureeSecondes() { return dureeSecondes; }
    public void setDureeSecondes(Integer dureeSecondes) { this.dureeSecondes = dureeSecondes; }

    public LocalDateTime getPlayedAt() { return playedAt; }
    public void setPlayedAt(LocalDateTime playedAt) { this.playedAt = playedAt; }
}
