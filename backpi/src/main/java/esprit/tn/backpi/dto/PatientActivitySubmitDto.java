package esprit.tn.backpi.dto;

public class PatientActivitySubmitDto {
    private Long userId;
    private Long activityId;
    private Integer bonnesReponses;
    private Integer mauvaisesReponses;
    private Integer dureeSecondes;

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Long getActivityId() { return activityId; }
    public void setActivityId(Long activityId) { this.activityId = activityId; }

    public Integer getBonnesReponses() { return bonnesReponses; }
    public void setBonnesReponses(Integer bonnesReponses) { this.bonnesReponses = bonnesReponses; }

    public Integer getMauvaisesReponses() { return mauvaisesReponses; }
    public void setMauvaisesReponses(Integer mauvaisesReponses) { this.mauvaisesReponses = mauvaisesReponses; }

    public Integer getDureeSecondes() { return dureeSecondes; }
    public void setDureeSecondes(Integer dureeSecondes) { this.dureeSecondes = dureeSecondes; }
}
