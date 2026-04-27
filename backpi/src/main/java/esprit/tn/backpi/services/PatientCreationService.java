package esprit.tn.backpi.services;

import esprit.tn.backpi.dto.PatientCreationRequest;
import esprit.tn.backpi.dto.PatientCreationResponse;
import esprit.tn.backpi.entity.Role;
import esprit.tn.backpi.entity.User;
import esprit.tn.backpi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;

@Service
@RequiredArgsConstructor
public class PatientCreationService {

    private final UserRepository userRepository;
    private final JavaMailSender mailSender;

    private static final String CHARS =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#!";
    private static final SecureRandom RANDOM = new SecureRandom();

    // ═══════════════════════════════════════════════════════════════
    // Créer un nouveau patient + relation
    // ═══════════════════════════════════════════════════════════════
    @Transactional
    public PatientCreationResponse creerPatientEtRelation(
            PatientCreationRequest req, Long doctorId) {

        if (userRepository.existsByEmail(req.getPatientEmail())) {
            throw new IllegalArgumentException(
                    "L'email patient '" + req.getPatientEmail() + "' est déjà utilisé.");
        }
        if (req.isCreerCompteRelation()
                && req.getRelationEmail() != null
                && !req.getRelationEmail().isBlank()
                && userRepository.existsByEmail(req.getRelationEmail())) {
            throw new IllegalArgumentException(
                    "L'email relation '" + req.getRelationEmail() + "' est déjà utilisé.");
        }

        String pwdPatient  = genererMotDePasse(10);
        String pwdRelation = genererMotDePasse(10);

        // Créer PATIENT
        User patient = new User();
        patient.setNom(req.getPatientNom());
        patient.setPrenom(req.getPatientPrenom());
        patient.setEmail(req.getPatientEmail());
        patient.setTelephone(req.getPatientTelephone());
        patient.setPassword(pwdPatient);
        patient.setRole(Role.PATIENT);
        patient.setActif(true);
        patient = userRepository.save(patient);

        // Créer RELATION
        User relation = null;
        if (req.isCreerCompteRelation()
                && req.getRelationEmail() != null
                && !req.getRelationEmail().isBlank()) {

            relation = new User();
            relation.setNom(req.getRelationNom());
            relation.setPrenom(req.getRelationPrenom());
            relation.setEmail(req.getRelationEmail());
            relation.setTelephone(req.getRelationTelephone());
            relation.setPassword(pwdRelation);
            relation.setRole(Role.RELATION);
            relation.setActif(true);
            relation.setPatientId(patient.getId());
            relation.setLienAvecPatient(req.getLienAvecPatient());
            relation = userRepository.save(relation);

            patient.setRelationId(relation.getId());
            userRepository.save(patient);
        }

        // Emails
        envoyerEmail(patient.getEmail(),
                "AlzCare – Vos identifiants",
                buildEmailPatient(patient, pwdPatient));

        if (relation != null) {
            envoyerEmail(relation.getEmail(),
                    "AlzCare – Acces au suivi de " + patient.getPrenom(),
                    buildEmailRelation(relation, patient, pwdRelation));
        }

        return PatientCreationResponse.builder()
                .patientId(patient.getId())
                .patientEmail(patient.getEmail())
                .patientMotDePasse(pwdPatient)
                .relationId(relation != null ? relation.getId() : null)
                .relationEmail(relation != null ? relation.getEmail() : null)
                .relationMotDePasse(relation != null ? pwdRelation : null)
                .message("Comptes créés avec succès.")
                .build();
    }

    // ═══════════════════════════════════════════════════════════════
    // Ajouter une relation à un patient EXISTANT
    // ═══════════════════════════════════════════════════════════════
    @Transactional
    public PatientCreationResponse ajouterRelationExistant(PatientCreationRequest req) {

        // 1. Vérifier que le patient existe
        User patient = userRepository.findById(req.getExistingPatientId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Patient introuvable avec l'id : " + req.getExistingPatientId()));

        // 2. Vérifier email relation non utilisé
        if (req.getRelationEmail() != null
                && userRepository.existsByEmail(req.getRelationEmail())) {
            throw new IllegalArgumentException(
                    "L'email '" + req.getRelationEmail() + "' est déjà utilisé.");
        }

        // 3. Créer le compte RELATION
        String pwdRelation = genererMotDePasse(10);

        User relation = new User();
        relation.setNom(req.getRelationNom());
        relation.setPrenom(req.getRelationPrenom());
        relation.setEmail(req.getRelationEmail());
        relation.setTelephone(req.getRelationTelephone());
        relation.setPassword(pwdRelation);
        relation.setRole(Role.RELATION);
        relation.setActif(true);
        relation.setPatientId(patient.getId());
        relation.setLienAvecPatient(req.getLienAvecPatient());
        relation = userRepository.save(relation);

        // 4. Lier la relation au patient
        patient.setRelationId(relation.getId());
        userRepository.save(patient);

        // 5. Email identifiants
        envoyerEmail(relation.getEmail(),
                "AlzCare – Acces au suivi de " + patient.getPrenom(),
                buildEmailRelation(relation, patient, pwdRelation));

        return PatientCreationResponse.builder()
                .patientId(patient.getId())
                .patientEmail(patient.getEmail())
                .patientMotDePasse(null)
                .relationId(relation.getId())
                .relationEmail(relation.getEmail())
                .relationMotDePasse(pwdRelation)
                .message("Compte relation créé et lié à "
                        + patient.getPrenom() + " " + patient.getNom() + ".")
                .build();
    }

    // ═══════════════════════════════════════════════════════════════
    // Helpers
    // ═══════════════════════════════════════════════════════════════
    private void envoyerEmail(String to, String subject, String body) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(to);
            msg.setSubject(subject);
            msg.setText(body);
            mailSender.send(msg);
        } catch (Exception e) {
            System.err.println("[EMAIL] Erreur : " + e.getMessage());
        }
    }

    private String buildEmailPatient(User u, String mdp) {
        return "Bonjour " + u.getPrenom() + " " + u.getNom() + ",\n\n"
                + "Votre médecin a créé votre compte AlzCare.\n\n"
                + "Email        : " + u.getEmail() + "\n"
                + "Mot de passe : " + mdp + "\n\n"
                + "Connectez-vous sur : http://localhost:4200/auth/login\n\n"
                + "L'équipe AlzCare";
    }

    private String buildEmailRelation(User r, User patient, String mdp) {
        return "Bonjour " + r.getPrenom() + " " + r.getNom() + ",\n\n"
                + "Vous avez été ajouté(e) comme contact de confiance de "
                + patient.getPrenom() + " " + patient.getNom() + ".\n\n"
                + "Email        : " + r.getEmail() + "\n"
                + "Mot de passe : " + mdp + "\n\n"
                + "Connectez-vous sur : http://localhost:4200/auth/login\n\n"
                + "L'équipe AlzCare";
    }

    private String genererMotDePasse(int n) {
        StringBuilder sb = new StringBuilder(n);
        for (int i = 0; i < n; i++)
            sb.append(CHARS.charAt(RANDOM.nextInt(CHARS.length())));
        return sb.toString();
    }
}