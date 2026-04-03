package esprit.tn.backpi.services.gestion_patient;

import esprit.tn.backpi.entities.gestion_patient.Analyse;
import esprit.tn.backpi.repositories.gestion_patient.AnalyseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AnalyseServiceImpl implements IAnalyseService {

    private final AnalyseRepository analyseRepository;

    @Override
    public List<Analyse> retrieveAllAnalyses() {
        return analyseRepository.findAll();
    }

    @Override
    public Analyse addAnalyse(Analyse a) {
        return analyseRepository.save(a);
    }

    @Override
    public Analyse updateAnalyse(Analyse a) {
        return analyseRepository.save(a);
    }

    @Override
    public Analyse retrieveAnalyse(Long id) {
        return analyseRepository.findById(id).orElse(null);
    }

    @Override
    public void removeAnalyse(Long id) {
        analyseRepository.deleteById(id);
    }

    @Override
    public List<Analyse> retrieveAnalysesByPatient(Long patientId) {
        return analyseRepository.findByPatientId(patientId);
    }
}
