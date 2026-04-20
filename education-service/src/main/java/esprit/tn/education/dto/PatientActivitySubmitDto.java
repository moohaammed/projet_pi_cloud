package esprit.tn.education.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientActivitySubmitDto {
    private Long userId;
    private String activityId;
    private Integer bonnesReponses;
    private Integer mauvaisesReponses;
    private Integer dureeSecondes;
}
