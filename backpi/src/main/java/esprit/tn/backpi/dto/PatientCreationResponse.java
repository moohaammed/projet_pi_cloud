package esprit.tn.backpi.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PatientCreationResponse {
    private Long   patientId;
    private String patientEmail;
    private String patientMotDePasse;     // temporaire, envoyé par email

    private Long   relationId;            // null si pas de relation créée
    private String relationEmail;
    private String relationMotDePasse;    // temporaire, envoyé par email

    private String message;
}