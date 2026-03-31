package esprit.tn.backpi.controllers.education;

import esprit.tn.backpi.entities.education.Activity;
import esprit.tn.backpi.entities.education.Activity.ActivityType;
import esprit.tn.backpi.entities.education.Activity.Stade;
import esprit.tn.backpi.services.education.ActivityService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/activities")
@CrossOrigin(origins = "http://localhost:4200")
public class ActivityController {

    @Autowired
    private ActivityService activityService;

    // GET /api/activities
    @GetMapping
    public List<Activity> getAll() {
        return activityService.getAllActivities();
    }

    // GET /api/activities/{id}
    @GetMapping("/{id}")
    public ResponseEntity<Activity> getById(@PathVariable Long id) {
        return ResponseEntity.ok(activityService.getActivityById(id));
    }

    // GET /api/activities/type/QUIZ
    @GetMapping("/type/{type}")
    public List<Activity> getByType(@PathVariable ActivityType type) {
        return activityService.getByType(type);
    }

    // GET /api/activities/stade/LEGER
    @GetMapping("/stade/{stade}")
    public List<Activity> getByStade(@PathVariable Stade stade) {
        return activityService.getByStade(stade);
    }

    // GET /api/activities/quiz-patient/{stade}
    @GetMapping("/quiz-patient/{stade}")
    public List<Activity> getQuizForPatient(@PathVariable String stade) {
        return activityService.getQuizForPatient(stade);
    }

    // POST /api/activities
    @PostMapping
    public ResponseEntity<Activity> create(@RequestBody Activity activity) {
        return ResponseEntity.ok(activityService.createActivity(activity));
    }

    // PUT /api/activities/{id}
    @PutMapping("/{id}")
    public ResponseEntity<Activity> update(
            @PathVariable Long id, @RequestBody Activity activity) {
        return ResponseEntity.ok(activityService.updateActivity(id, activity));
    }

    // DELETE /api/activities/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        activityService.deleteActivity(id);
        return ResponseEntity.noContent().build();
    }
}