package esprit.tn.education.services;

import esprit.tn.education.entities.Activity;
import esprit.tn.education.entities.Activity.ActivityType;
import esprit.tn.education.entities.Activity.Stade;
import esprit.tn.education.exception.ResourceNotFoundException;
import esprit.tn.education.repositories.ActivityRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ActivityService {

    @Autowired
    private ActivityRepository activityRepository;

    public Activity createActivity(Activity activity) {
        return activityRepository.save(activity);
    }

    public List<Activity> getAllActivities() {
        return activityRepository.findAll();
    }

    public Activity getActivityById(String id) {
        return activityRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Activity non trouvée : " + id));
    }

    public List<Activity> getByType(ActivityType type) {
        return activityRepository.findByType(type);
    }

    public List<Activity> getByStade(Stade stade) {
        return activityRepository.findByActiveTrueAndStade(stade);
    }

    public Activity updateActivity(String id, Activity updated) {
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

    public void deleteActivity(String id) {
        activityRepository.deleteById(id);
    }

    public List<Activity> getQuizForPatient(String stade) {
        Stade s = Stade.valueOf(stade.toUpperCase());
        return activityRepository.findByTypeAndStade(ActivityType.QUIZ, s);
    }
}
