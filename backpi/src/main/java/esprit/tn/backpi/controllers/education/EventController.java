package esprit.tn.backpi.controllers.education;

import esprit.tn.backpi.entities.education.Event;
import esprit.tn.backpi.services.collaboration.FileStorageService;
import esprit.tn.backpi.services.education.EventService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/events")
@CrossOrigin(origins = "http://localhost:4200")
public class EventController {

    @Autowired
    private EventService eventService;

    @Autowired
    private FileStorageService fileStorageService;

    // GET /api/events
    @GetMapping
    public List<Event> getAll() {
        return eventService.getAllEvents();
    }

    // GET /api/events/{id}
    @GetMapping("/{id}")
    public ResponseEntity<Event> getById(@PathVariable Long id) {
        return ResponseEntity.ok(eventService.getEventById(id));
    }

    // GET /api/events/user/{userId}
    @GetMapping("/user/{userId}")
    public List<Event> getByUser(@PathVariable Long userId) {
        return eventService.getEventsByUser(userId);
    }

    // GET /api/events/reminders
    @GetMapping("/reminders")
    public List<Event> getReminders() {
        return eventService.getEventsWithReminder();
    }

    // POST /api/events
    @PostMapping
    public ResponseEntity<Event> create(@RequestBody Event event) {
        return ResponseEntity.ok(eventService.createEvent(event));
    }

    // PUT /api/events/{id}
    @PutMapping("/{id}")
    public ResponseEntity<Event> update(@PathVariable Long id, @RequestBody Event event) {
        return ResponseEntity.ok(eventService.updateEvent(id, event));
    }

    // DELETE /api/events/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        eventService.deleteEvent(id);
        return ResponseEntity.noContent().build();
    }

    // POST /api/events/{id}/image
    @PostMapping("/{id}/image")
public ResponseEntity<Event> uploadImage(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
    Event event = eventService.getEventById(id);
    String imageUrl = fileStorageService.storeFile(file);
    event.setImageUrl(imageUrl);
    Event saved = eventService.updateEvent(id, event);  // ✅ met à jour l'existant
    return ResponseEntity.ok(saved);
}
}