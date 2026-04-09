package esprit.tn.rendezvous.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Date;

@Document(collection = "rendezvous")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RendezVous {

    @Id
    private String id;

    private Long patientId;
    private Long medecinId;

    private Date dateHeure;

    private String motif;
    private String observations;

    private StatutRendezVous statut;

    public void prePersist() {
        if (this.statut == null) {
            this.statut = StatutRendezVous.PLANIFIE;
        }
    }
}
