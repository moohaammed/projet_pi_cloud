package esprit.tn.education.controllers;

import esprit.tn.education.entities.Activity;
import esprit.tn.education.entities.Activity.ActivityType;
import esprit.tn.education.entities.Activity.Stade;
import esprit.tn.education.services.ActivityService;
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

    @GetMapping
    public List<Activity> getAll() {
        return activityService.getAllActivities();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Activity> getById(@PathVariable String id) {
        return ResponseEntity.ok(activityService.getActivityById(id));
    }

    @GetMapping("/type/{type}")
    public List<Activity> getByType(@PathVariable ActivityType type) {
        return activityService.getByType(type);
    }

    @GetMapping("/stade/{stade}")
    public List<Activity> getByStade(@PathVariable Stade stade) {
        return activityService.getByStade(stade);
    }

    @GetMapping("/quiz-patient/{stade}")
    public List<Activity> getQuizForPatient(@PathVariable String stade) {
        return activityService.getQuizForPatient(stade);
    }

    @PostMapping
    public ResponseEntity<Activity> create(@RequestBody Activity activity) {
        return ResponseEntity.ok(activityService.createActivity(activity));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Activity> update(
            @PathVariable String id, @RequestBody Activity activity) {
        return ResponseEntity.ok(activityService.updateActivity(id, activity));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        activityService.deleteActivity(id);
        return ResponseEntity.noContent().build();
    }
}
