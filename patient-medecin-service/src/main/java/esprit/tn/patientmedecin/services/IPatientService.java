package esprit.tn.patientmedecin.services;

import esprit.tn.patientmedecin.entities.Patient;
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
