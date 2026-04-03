package esprit.tn.backpi.services.gestion_patient;

import esprit.tn.backpi.entities.gestion_patient.Analyse;
import java.util.List;

public interface IAnalyseService {
    List<Analyse> retrieveAllAnalyses();

    Analyse addAnalyse(Analyse a);

    Analyse updateAnalyse(Analyse a);

    Analyse retrieveAnalyse(Long id);

    void removeAnalyse(Long id);

    List<Analyse> retrieveAnalysesByPatient(Long patientId);
}
