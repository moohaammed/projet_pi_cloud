package esprit.tn.education.services;

import esprit.tn.education.entities.Event;
import esprit.tn.education.exception.ResourceNotFoundException;
import esprit.tn.education.repositories.EventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EventService {

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private EventSeatService eventSeatService;

    public Event createEvent(Event event) {
        if (event.getCapacity() != null) {
            event.setAvailablePlaces(event.getCapacity());
        }
        Event saved = eventRepository.save(event);
        eventSeatService.generateSeats(saved);
        return saved;
    }

    public List<Event> getAllEvents() {
        return eventRepository.findAll();
    }

    public Event getEventById(String id) {
        return eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event non trouvé : " + id));
    }

    public List<Event> getEventsByUser(Long userId) {
        return eventRepository.findByUserId(userId);
    }

    public Event updateEvent(String id, Event updated) {
        Event existing = getEventById(id);

        existing.setTitle(updated.getTitle());
        existing.setStartDateTime(updated.getStartDateTime());
        existing.setLocation(updated.getLocation());
        existing.setDescription(updated.getDescription());
        existing.setRemindEnabled(updated.getRemindEnabled());
        existing.setUserId(updated.getUserId());
        existing.setActivityId(updated.getActivityId());

        if (updated.getCapacity() != null && !updated.getCapacity().equals(existing.getCapacity())) {
            existing.setCapacity(updated.getCapacity());
            existing.setAvailablePlaces(updated.getCapacity());
            eventSeatService.generateSeats(existing);
        }

        if (updated.getImageUrl() != null) {
            existing.setImageUrl(updated.getImageUrl());
        }

        return eventRepository.save(existing);
    }

    public void deleteEvent(String id) {
        eventRepository.deleteById(id);
    }
}
