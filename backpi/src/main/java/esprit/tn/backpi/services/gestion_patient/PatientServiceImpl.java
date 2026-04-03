package esprit.tn.backpi.services.gestion_patient;

import esprit.tn.backpi.entities.gestion_patient.Patient;
import esprit.tn.backpi.repositories.gestion_patient.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PatientServiceImpl implements IPatientService {

    private final PatientRepository patientRepository;

    @Override
    public List<Patient> retrieveAllPatients() {
        return patientRepository.findAll();
    }

    @Override
    public Patient addPatient(Patient p) {
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
