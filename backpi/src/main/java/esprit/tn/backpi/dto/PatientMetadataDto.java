package esprit.tn.backpi.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Lightweight DTO exposing only the patient metadata
 * needed by the smartwatch-service AI prediction pipeline.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PatientMetadataDto {

    private Integer age;
    private String sexe;
    private Double poids;
}
