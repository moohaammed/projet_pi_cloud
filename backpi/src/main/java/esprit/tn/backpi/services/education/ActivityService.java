package esprit.tn.backpi.services.education;

import esprit.tn.backpi.entities.education.Activity;
import esprit.tn.backpi.entities.education.Activity.ActivityType;
import esprit.tn.backpi.entities.education.Activity.Stade;
import esprit.tn.backpi.repositories.education.ActivityRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ActivityService {

    @Autowired
    private ActivityRepository activityRepository;

    // CREATE
    public Activity createActivity(Activity activity) {
        return activityRepository.save(activity);
    }

    // READ ALL
    public List<Activity> getAllActivities() {
        return activityRepository.findAll();
    }

    // READ BY ID
    public Activity getActivityById(Long id) {
        return activityRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Activity non trouvée : " + id));
    }

    // READ BY TYPE (QUIZ, GAME, CONTENT, EXERCICE)
    public List<Activity> getByType(ActivityType type) {
        return activityRepository.findByType(type);
    }

    // READ BY STADE (utilisé par l'IA)
    public List<Activity> getByStade(Stade stade) {
        return activityRepository.findByActiveTrueAndStade(stade);
    }

    // UPDATE
    public Activity updateActivity(Long id, Activity updated) {
        Activity existing = getActivityById(id);
        existing.setTitle(updated.getTitle());
        existing.setType(updated.getType());
        existing.setStade(updated.getStade());
        existing.setDescription(updated.getDescription());
        existing.setData(updated.getData());
        existing.setEstimatedMinutes(updated.getEstimatedMinutes());
        existing.setActive(updated.getActive());
        return activityRepository.save(existing);
    }

    // DELETE
    public void deleteActivity(Long id) {
        activityRepository.deleteById(id);
    }

    // MÉTIER : sélection intelligente pour le quiz patient
    public List<Activity> getQuizForPatient(String stade) {
        Stade s = Stade.valueOf(stade.toUpperCase());
        return activityRepository.findByTypeAndStade(ActivityType.QUIZ, s);
    }
}