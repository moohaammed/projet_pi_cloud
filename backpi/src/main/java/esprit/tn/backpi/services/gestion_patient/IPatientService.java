package esprit.tn.backpi.services.gestion_patient;

import esprit.tn.backpi.entities.gestion_patient.Patient;
import java.util.List;

public interface IPatientService {
    List<Patient> retrieveAllPatients();

    Patient addPatient(Patient p);

    Patient updatePatient(Patient p);

    Patient retrievePatient(Long id);

    void removePatient(Long id);

    /**
     * Retrieve the patient linked to a given user ID.
     * Returns null if no patient is linked to this user.
     */
    Patient retrievePatientByUserId(Long userId);
}
