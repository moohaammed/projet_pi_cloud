package esprit.tn.backpi.repository;

import esprit.tn.backpi.entity.Role;
import esprit.tn.backpi.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    List<User> findByRole(Role role);

    List<User> findByActif(boolean actif);

    @Query("SELECT u FROM User u WHERE LOWER(u.nom) = LOWER(:fullName) OR LOWER(u.prenom) = LOWER(:fullName) OR LOWER(CONCAT(u.nom, ' ', u.prenom)) = LOWER(:fullName)")
    Optional<User> findByFullName(@Param("fullName") String fullName);
}