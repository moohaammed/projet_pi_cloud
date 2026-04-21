package esprit.tn.patientmedecin.entities;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "jeux_cognitifs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class JeuCognitif {

    @Transient
    public static final String SEQUENCE_NAME = "jeux_sequence";

    @Id
    private Long id;

    private String nom;
    private String description;
}
