package esprit.tn.backpi.service;

import esprit.tn.backpi.entity.Role;
import esprit.tn.backpi.entity.User;
import esprit.tn.backpi.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    // GET ALL
    public List<User> findAll() {
        return userRepository.findAll();
    }

    // GET BY ID
    public User findById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User non trouvé id: " + id));
    }

    // GET BY ROLE
    public List<User> findByRole(Role role) {
        return userRepository.findByRole(role);
    }

    // GET BY EMAIL
    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User non trouvé email: " + email));
    }

    // CREATE
    public User create(User user) {
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new RuntimeException("Email déjà utilisé: " + user.getEmail());
        }
        User saved = userRepository.save(user);
        return saved;
    }

    // UPDATE
    public User update(Long id, User userDetails) {
        User user = findById(id);
        Role oldRole = user.getRole();
        user.setNom(userDetails.getNom());
        user.setPrenom(userDetails.getPrenom());
        user.setEmail(userDetails.getEmail());
        user.setRole(userDetails.getRole());
        user.setActif(userDetails.isActif());
        User saved = userRepository.save(user);
        return saved;
    }

    // TOGGLE ACTIF / DESACTIVER
    public User toggleActif(Long id) {
        User user = findById(id);
        user.setActif(!user.isActif());
        return userRepository.save(user);
    }

    // TOGGLE LIVE
    public User toggleLive(Long id) {
        User user = findById(id);
        user.setLive(!user.isLive());
        return userRepository.save(user);
    }

    // DELETE
    public void delete(Long id) {
        User user = findById(id);
        userRepository.delete(user);
    }
}