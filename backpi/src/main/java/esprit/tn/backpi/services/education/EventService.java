package esprit.tn.backpi.services.education;

import esprit.tn.backpi.entities.education.Event;
import esprit.tn.backpi.repositories.education.EventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EventService {

    @Autowired
    private EventRepository eventRepository;

    // CREATE
    public Event createEvent(Event event) {
        return eventRepository.save(event);
    }

    // READ ALL
    public List<Event> getAllEvents() {
        return eventRepository.findAll();
    }

    // READ BY ID
    public Event getEventById(Long id) {
        return eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event non trouvé : " + id));
    }

    // READ BY USER
    public List<Event> getEventsByUser(Long userId) {
        return eventRepository.findByUserId(userId);
    }

    // UPDATE
    public Event updateEvent(Long id, Event updated) {
        Event existing = getEventById(id);

        existing.setTitle(updated.getTitle());
        existing.setStartDateTime(updated.getStartDateTime());
        existing.setLocation(updated.getLocation());
        existing.setDescription(updated.getDescription());
        existing.setRemindEnabled(updated.getRemindEnabled());
        existing.setUserId(updated.getUserId());
        existing.setActivityId(updated.getActivityId());

        // Ne pas écraser imageUrl si elle n'est pas fournie
        if (updated.getImageUrl() != null) {
            existing.setImageUrl(updated.getImageUrl());
        }

        return eventRepository.save(existing);
    }

    // DELETE
    public void deleteEvent(Long id) {
        eventRepository.deleteById(id);
    }

    // MÉTIER : événements avec rappel activé
    public List<Event> getEventsWithReminder() {
        return eventRepository.findByRemindEnabledTrue();
    }
}