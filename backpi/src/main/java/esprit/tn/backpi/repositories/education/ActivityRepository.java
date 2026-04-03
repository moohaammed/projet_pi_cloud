package esprit.tn.backpi.repositories.education;

import esprit.tn.backpi.entities.education.Activity;
import esprit.tn.backpi.entities.education.Activity.ActivityType;
import esprit.tn.backpi.entities.education.Activity.Stade;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ActivityRepository extends JpaRepository<Activity, Long> {

    // Filtrer par type
    List<Activity> findByType(ActivityType type);

    // Filtrer par stade (utilisé par le modèle IA)
    List<Activity> findByStade(Stade stade);

    // Filtrer par type ET stade
    List<Activity> findByTypeAndStade(ActivityType type, Stade stade);

    // Seulement les actives
    List<Activity> findByActiveTrue();

    // Actives filtrées par stade
    List<Activity> findByActiveTrueAndStade(Stade stade);
}