package esprit.tn.backpi.service;

import esprit.tn.backpi.dto.PatientHeartRateAccessDto;
import esprit.tn.backpi.entity.PatientContact;
import esprit.tn.backpi.entity.RelationType;
import esprit.tn.backpi.entity.Role;
import esprit.tn.backpi.entity.User;
import esprit.tn.backpi.repository.PatientContactRepository;
import esprit.tn.backpi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class HeartRateAccessService {

    private final UserRepository userRepository;
    private final PatientContactRepository patientContactRepository;

    public List<PatientHeartRateAccessDto> getPatientsForDoctor(Long doctorUserId) {
        User doctor = requireRole(doctorUserId, Role.DOCTOR);
        repairContactUserLinksByEmail(doctor, Set.of(RelationType.DOCTOR));

        return patientContactRepository.findByRelationTypeAndContactUserId(RelationType.DOCTOR, doctor.getId())
                .stream()
                .map(this::toLinkedPatientDto)
                .flatMap(Optional::stream)
                .distinct()
                .toList();
    }

    public List<PatientHeartRateAccessDto> getPatientsForAdmin(Long adminUserId) {
        requireRole(adminUserId, Role.ADMIN);

        return userRepository.findByRole(Role.PATIENT)
                .stream()
                .map(this::toAdminPatientDto)
                .toList();
    }

    public List<PatientHeartRateAccessDto> getPatientsForRelation(Long relationUserId) {
        User relation = requireRole(relationUserId, Role.RELATION);
        repairContactUserLinksByEmail(
                relation,
                Set.of(RelationType.PARENT, RelationType.CAREGIVER, RelationType.RELATION)
        );

        return patientContactRepository.findByContactUserId(relationUserId)
                .stream()
                .filter(contact -> contact.getRelationType() != RelationType.DOCTOR)
                .map(this::toLinkedPatientDto)
                .flatMap(Optional::stream)
                .distinct()
                .toList();
    }

    public Optional<PatientHeartRateAccessDto> getLinkedPatientForRelation(Long relationUserId) {
        return getPatientsForRelation(relationUserId)
                .stream()
                .findFirst();
    }

    private User requireRole(Long userId, Role expectedRole) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (user.getRole() != expectedRole) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied for role " + user.getRole());
        }

        return user;
    }

    private Optional<PatientHeartRateAccessDto> toLinkedPatientDto(PatientContact contact) {
        Long patientUserId = contact.getPatientUserId();

        if (patientUserId == null) {
            return Optional.empty();
        }

        return userRepository.findById(patientUserId)
                .filter(user -> user.getRole() == Role.PATIENT)
                .map(this::toDto);
    }

    private PatientHeartRateAccessDto toDto(User patientUser) {
        return PatientHeartRateAccessDto.builder()
                .patientId(patientUser.getId())
                .userId(patientUser.getId())
                .nom(patientUser.getNom())
                .prenom(patientUser.getPrenom())
                .age(30)
                .poids(80.0)
                .sexe("homme")
                .build();
    }

    private PatientHeartRateAccessDto toAdminPatientDto(User patientUser) {
        return toDto(patientUser);
    }

    private void repairContactUserLinksByEmail(User contactUser, Set<RelationType> allowedRelationTypes) {
        if (contactUser.getEmail() == null || contactUser.getEmail().isBlank()) {
            return;
        }

        List<PatientContact> repaired = patientContactRepository.findByEmailIgnoreCase(contactUser.getEmail().trim())
                .stream()
                .filter(contact -> allowedRelationTypes.contains(contact.getRelationType()))
                .filter(contact -> !contactUser.getId().equals(contact.getContactUserId()))
                .peek(contact -> contact.setContactUserId(contactUser.getId()))
                .toList();

        if (!repaired.isEmpty()) {
            patientContactRepository.saveAll(repaired);
        }
    }
}