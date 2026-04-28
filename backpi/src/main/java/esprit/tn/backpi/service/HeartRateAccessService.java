package esprit.tn.backpi.service;

import esprit.tn.backpi.dto.PatientHeartRateAccessDto;
import esprit.tn.backpi.entities.gestion_patient.Patient;
import esprit.tn.backpi.entity.PatientContact;
import esprit.tn.backpi.entity.RelationType;
import esprit.tn.backpi.entity.Role;
import esprit.tn.backpi.entity.User;
import esprit.tn.backpi.repositories.gestion_patient.PatientRepository;
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
    private final PatientRepository patientRepository;
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
        repairContactUserLinksByEmail(relation, Set.of(RelationType.PARENT, RelationType.CAREGIVER, RelationType.RELATION));

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

    private PatientHeartRateAccessDto toDto(Patient patient) {
        Long userId = patient.getUser() != null ? patient.getUser().getId() : null;
        return PatientHeartRateAccessDto.builder()
                .patientId(patient.getId())
                .userId(userId)
                .nom(patient.getNom())
                .prenom(patient.getPrenom())
                .age(patient.getAge())
                .poids(patient.getPoids())
                .sexe(patient.getSexe())
                .build();
    }

    private Optional<PatientHeartRateAccessDto> toLinkedPatientDto(PatientContact contact) {
        Long patientUserId = contact.getPatientUserId();
        if (patientUserId == null) {
            return Optional.empty();
        }

        Optional<Patient> patientProfile = patientRepository.findByUser_Id(patientUserId);
        if (patientProfile.isPresent()) {
            return Optional.of(toDto(patientProfile.get()));
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
                .build();
    }

    private PatientHeartRateAccessDto toAdminPatientDto(User patientUser) {
        PatientHeartRateAccessDto.PatientHeartRateAccessDtoBuilder builder = PatientHeartRateAccessDto.builder()
                .patientId(patientUser.getId())
                .userId(patientUser.getId())
                .nom(patientUser.getNom())
                .prenom(patientUser.getPrenom());

        patientRepository.findByUser_Id(patientUser.getId())
                .ifPresent(profile -> builder
                        .nom(profile.getNom() != null ? profile.getNom() : patientUser.getNom())
                        .prenom(profile.getPrenom() != null ? profile.getPrenom() : patientUser.getPrenom())
                        .age(profile.getAge())
                        .poids(profile.getPoids())
                        .sexe(profile.getSexe()));

        return builder.build();
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
