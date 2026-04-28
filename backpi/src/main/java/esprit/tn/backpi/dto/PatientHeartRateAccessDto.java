package esprit.tn.backpi.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PatientHeartRateAccessDto {

    private Long patientId;
    private Long userId;
    private String nom;
    private String prenom;
    private Integer age;
    private Double poids;
    private String sexe;
}
