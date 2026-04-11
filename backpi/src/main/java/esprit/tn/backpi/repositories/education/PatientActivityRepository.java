package esprit.tn.backpi.repositories.education;

import esprit.tn.backpi.entities.education.Activity;
import esprit.tn.backpi.entities.education.PatientActivity;
import esprit.tn.backpi.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PatientActivityRepository extends JpaRepository<PatientActivity, Long> {
    Optional<PatientActivity> findFirstByUserOrderByPlayedAtDesc(User user);
    Optional<PatientActivity> findFirstByUserAndActivity_TypeOrderByPlayedAtDesc(User user, Activity.ActivityType type);
    List<PatientActivity> findAllByUserOrderByPlayedAtDesc(User user);
    List<PatientActivity> findAllByUserAndActivity_TypeAndReussiTrue(User user, Activity.ActivityType type);
    void deleteByUser(User user);
    void deleteByUserAndActivity_Type(User user, Activity.ActivityType type);
}
