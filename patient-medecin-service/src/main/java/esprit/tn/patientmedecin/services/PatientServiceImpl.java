package esprit.tn.patientmedecin.services;

import esprit.tn.patientmedecin.entities.Patient;
import esprit.tn.patientmedecin.repositories.PatientRepository;
import esprit.tn.patientmedecin.sequence.SequenceGeneratorService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PatientServiceImpl implements IPatientService {

    private final PatientRepository patientRepository;
    private final SequenceGeneratorService sequenceGenerator;

    public PatientServiceImpl(PatientRepository patientRepository, SequenceGeneratorService sequenceGenerator) {
        this.patientRepository = patientRepository;
        this.sequenceGenerator = sequenceGenerator;
    }

    @Override
    public List<Patient> retrieveAllPatients() {
        return patientRepository.findAll();
    }

    @Override
    public Patient addPatient(Patient p) {
        if (p.getId() == null) {
            p.setId(sequenceGenerator.generateSequence(Patient.SEQUENCE_NAME));
        }
        return patientRepository.save(p);
    }

    @Override
    public Patient updatePatient(Patient p) {
        return patientRepository.save(p);
    }

    @Override
    public Patient retrievePatient(Long id) {
        return patientRepository.findById(id).orElse(null);
    }

    @Override
    public void removePatient(Long id) {
        patientRepository.deleteById(id);
    }
}
