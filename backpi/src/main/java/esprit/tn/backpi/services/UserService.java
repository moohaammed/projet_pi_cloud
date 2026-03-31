package esprit.tn.backpi.services;
 
import esprit.tn.backpi.entities.User;
import esprit.tn.backpi.repositories.UserRepository;
import org.springframework.stereotype.Service;
 
import java.util.List;
 
@Service
public class UserService {
 
    private final UserRepository userRepository;
 
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
 
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }
 
    public User getUserById(Long id) {
        return userRepository.findById(id).orElse(null);
    }
 
    public User createUser(User user) {
        return userRepository.save(user);
    }
 
    public User updateUser(Long id, User updatedUser) {
        return userRepository.findById(id).map(user -> {
            user.setName(updatedUser.getName());
            return userRepository.save(user);
        }).orElse(null);
    }
 
    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }
}
