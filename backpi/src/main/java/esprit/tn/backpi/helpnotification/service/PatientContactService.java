package esprit.tn.backpi.helpnotification.service;

import esprit.tn.backpi.helpnotification.dto.PatientContactDTO;
import esprit.tn.backpi.entity.PatientContact;
import esprit.tn.backpi.entity.RelationType;
import esprit.tn.backpi.entity.Role;
import esprit.tn.backpi.entity.User;
import esprit.tn.backpi.repository.PatientContactRepository;
import esprit.tn.backpi.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class PatientContactService {

    @Autowired
    private PatientContactRepository patientContactRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * List all contacts for a given patient user.
     */
    public List<PatientContact> getContactsForPatient(Long patientUserId) {
        validatePatientUser(patientUserId);
        return patientContactRepository.findByPatientUserId(patientUserId);
    }

    /**
     * Create a new contact for a patient.
     * Automatically links contact_user_id if the email matches an existing user.
     */
    public PatientContact createContact(Long patientUserId, PatientContactDTO dto) {
        validatePatientUser(patientUserId);

        PatientContact contact = new PatientContact();
        contact.setPatientUserId(patientUserId);
        contact.setRelationType(dto.getRelationType());
        contact.setNom(dto.getNom());
        contact.setPrenom(dto.getPrenom());
        contact.setEmail(normalizeEmail(dto.getEmail()));
        contact.setTelephone(dto.getTelephone());
        contact.setContactUserId(dto.getContactUserId());
        contact.setCreatedAt(LocalDateTime.now());

        // Auto-link: check if email matches an existing user
        resolveContactUserId(contact);

        return patientContactRepository.save(contact);
    }

    /**
     * Update an existing contact for a patient.
     * Re-checks the email to update contact_user_id link.
     */
    public PatientContact updateContact(Long patientUserId, Long contactId, PatientContactDTO dto) {
        validatePatientUser(patientUserId);

        PatientContact contact = patientContactRepository.findByIdAndPatientUserId(contactId, patientUserId)
                .orElseThrow(() -> new RuntimeException("Contact not found or access denied"));

        contact.setRelationType(dto.getRelationType());
        contact.setNom(dto.getNom());
        contact.setPrenom(dto.getPrenom());
        contact.setEmail(normalizeEmail(dto.getEmail()));
        contact.setTelephone(dto.getTelephone());
        contact.setContactUserId(dto.getContactUserId());

        // Re-resolve the link
        resolveContactUserId(contact);

        return patientContactRepository.save(contact);
    }

    /**
     * Delete a contact belonging to a patient.
     */
    public void deleteContact(Long patientUserId, Long contactId) {
        validatePatientUser(patientUserId);

        PatientContact contact = patientContactRepository.findByIdAndPatientUserId(contactId, patientUserId)
                .orElseThrow(() -> new RuntimeException("Contact not found or access denied"));

        patientContactRepository.delete(contact);
    }

    /**
     * If the contact's email matches an existing user, set contact_user_id.
     * Otherwise set it to null.
     */
    private void resolveContactUserId(PatientContact contact) {
        if (contact.getEmail() != null && !contact.getEmail().isBlank()) {
            userRepository.findByEmailIgnoreCase(contact.getEmail())
                    .ifPresentOrElse(
                            user -> {
                                validateContactRole(user, contact.getRelationType());
                                contact.setContactUserId(user.getId());
                            },
                            () -> contact.setContactUserId(null)
                    );
        } else if (contact.getContactUserId() != null) {
            validateContactRole(contact.getContactUserId(), contact.getRelationType());
        } else {
            contact.setContactUserId(null);
        }
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim();
    }

    private void validateContactRole(Long contactUserId, RelationType relationType) {
        User user = userRepository.findById(contactUserId)
                .orElseThrow(() -> new RuntimeException("Linked user not found"));
        validateContactRole(user, relationType);
    }

    private void validateContactRole(User user, RelationType relationType) {
        if (relationType == RelationType.DOCTOR && user.getRole() != Role.DOCTOR) {
            throw new RuntimeException("Doctor links must use a doctor account email");
        }
        if (relationType != RelationType.DOCTOR && user.getRole() != Role.RELATION) {
            throw new RuntimeException("Relation links must use a relation account email");
        }
    }

    /**
     * Validate that the given userId exists and has role PATIENT.
     */
    private void validatePatientUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (user.getRole() != Role.PATIENT) {
            throw new RuntimeException("User is not a patient");
        }
    }
}
