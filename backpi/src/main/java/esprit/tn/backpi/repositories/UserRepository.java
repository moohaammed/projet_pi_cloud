package esprit.tn.backpi.repositories;

import esprit.tn.backpi.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
}
