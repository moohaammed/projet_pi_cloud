package esprit.tn.patientmedecin.entities;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Document(collection = "rappel_quotidien")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RappelQuotidien {

    @Transient
    public static final String SEQUENCE_NAME = "rappel_sequence";

    @Id
    private Long id;

    @DBRef
    private Patient patient;

    private String titre;

    private String description;

    @Field("heure_rappel")
    private LocalTime heureRappel;

    private String jours = "TOUS";

    private TypeRappel type = TypeRappel.AUTRE;

    private boolean actif = true;

    private UserInfo createdBy;

    @Field("created_at")
    private LocalDateTime createdAt;

    @Field("voice_message_path")
    private String voiceMessagePath;

    public enum TypeRappel {
        MEDICAMENT, REPAS, HYGIENE, EXERCICE, SOCIAL, AUTRE
    }
}
