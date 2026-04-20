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
    // ← PasswordEncoder supprimé : votre auth compare en texte clair

    private static final String CHARS =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#!";
    private static final SecureRandom RANDOM = new SecureRandom();

    @Transactional
    public PatientCreationResponse creerPatientEtRelation(
            PatientCreationRequest req, Long doctorId) {

        // ── Vérifier emails déjà utilisés ─────────────────────
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

        // ── Créer PATIENT ─────────────────────────────────────
        User patient = new User();
        patient.setNom(req.getPatientNom());
        patient.setPrenom(req.getPatientPrenom());
        patient.setEmail(req.getPatientEmail());
        patient.setTelephone(req.getPatientTelephone());
        patient.setPassword(pwdPatient);           // ← texte clair, comme votre auth
        patient.setRole(Role.PATIENT);
        patient.setActif(true);
        // Champs optionnels — à décommenter si présents dans votre entité User :
        // patient.setDateNaissance(req.getPatientDateNaissance());
        // patient.setStade(req.getStadeAlzheimer());
        // patient.setNotes(req.getNotesMedicales());
        // patient.setAdresse(req.getPatientAdresse());
        // patient.setContactUrgenceNom(req.getRelationNom() + " " + req.getRelationPrenom());
        // patient.setContactUrgenceTelephone(req.getRelationTelephone());
        // patient.setContactUrgenceRelation(req.getLienAvecPatient());
        patient = userRepository.save(patient);

        // ── Créer RELATION (optionnel) ────────────────────────
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
            relation.setPatientId(patient.getId());          // ← lien vers patient
            relation.setLienAvecPatient(req.getLienAvecPatient());
            relation = userRepository.save(relation);

            // Mettre à jour le patient avec l'id de sa relation
            patient.setRelationId(relation.getId());
            userRepository.save(patient);
        }

        // ── Emails ────────────────────────────────────────────
        envoyerEmail(patient.getEmail(),
                "AlzCare – Vos identifiants",
                buildEmailPatient(patient, pwdPatient));

        if (relation != null) {
            envoyerEmail(relation.getEmail(),
                    "AlzCare – Accès au suivi de " + patient.getPrenom(),
                    buildEmailRelation(relation, patient, pwdRelation));
        }

        // ── Réponse ───────────────────────────────────────────
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

    // ── Email helpers ─────────────────────────────────────────
    private void envoyerEmail(String to, String subject, String body) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(to);
            msg.setSubject(subject);
            msg.setText(body);
            mailSender.send(msg);
        } catch (Exception e) {
            // Ne bloque pas la création si l'email échoue
            System.err.println("[EMAIL] Erreur : " + e.getMessage());
        }
    }

    private String buildEmailPatient(User u, String mdp) {
        return "Bonjour " + u.getPrenom() + " " + u.getNom() + ",\n\n"
                + "Votre médecin a créé votre compte AlzCare.\n\n"
                + "Email     : " + u.getEmail() + "\n"
                + "Mot de passe : " + mdp + "\n\n"
                + "Connectez-vous sur : http://localhost:4200/auth/login\n\n"
                + "L'équipe AlzCare";
    }

    private String buildEmailRelation(User r, User patient, String mdp) {
        return "Bonjour " + r.getPrenom() + " " + r.getNom() + ",\n\n"
                + "Vous avez été ajouté(e) comme contact de confiance de "
                + patient.getPrenom() + " " + patient.getNom() + ".\n\n"
                + "Email     : " + r.getEmail() + "\n"
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