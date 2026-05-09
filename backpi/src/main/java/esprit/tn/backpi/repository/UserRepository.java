package esprit.tn.backpi.repository;

import esprit.tn.backpi.entity.Role;
import esprit.tn.backpi.entity.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends MongoRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmail(String email);

    List<User> findByRole(Role role);

    List<User> findByActif(boolean actif);

    /**
     * Case-insensitive search by nom OR prenom (replaces JPQL CONCAT version).
     * MongoDB $or + $regex is the equivalent of SQL: LOWER(nom) = LOWER(:fn) OR LOWER(prenom) = LOWER(:fn)
     */
    @Query("{ '$or': [ { 'nom': { '$regex': ?0, '$options': 'i' } }, { 'prenom': { '$regex': ?0, '$options': 'i' } }, { '$expr': { '$regexMatch': { 'input': { '$concat': ['$nom', ' ', '$prenom'] }, 'regex': ?0, 'options': 'i' } } } ] }")
    Optional<User> findByFullName(String fullName);
}
