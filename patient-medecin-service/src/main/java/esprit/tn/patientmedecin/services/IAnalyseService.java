package esprit.tn.patientmedecin.services;

import esprit.tn.patientmedecin.entities.Analyse;

import java.util.List;

public interface IAnalyseService {
    List<Analyse> retrieveAllAnalyses();
    Analyse addAnalyse(Analyse a);
    Analyse updateAnalyse(Analyse a);
    Analyse retrieveAnalyse(Long id);
    void removeAnalyse(Long id);
    List<Analyse> retrieveAnalysesByPatient(Long patientId);
}
