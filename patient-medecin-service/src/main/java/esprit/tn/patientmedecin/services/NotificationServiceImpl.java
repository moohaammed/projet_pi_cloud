package esprit.tn.patientmedecin.services;

import esprit.tn.patientmedecin.entities.Notificationpatient;
import esprit.tn.patientmedecin.repositories.PatientNotificationRepository;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class NotificationServiceImpl implements INotificationService {

    private final PatientNotificationRepository notificationRepository;
    private final MongoTemplate mongoTemplate;

    public NotificationServiceImpl(PatientNotificationRepository notificationRepository, MongoTemplate mongoTemplate) {
        this.notificationRepository = notificationRepository;
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public List<Notificationpatient> getLatest(Long patientId) {
        return notificationRepository.findTop10ByPatient_Id(patientId);
    }

    @Override
    public void markAsRead(Long id) {
        Notificationpatient n = notificationRepository.findById(id).orElseThrow();
        n.setRead(true);
        notificationRepository.save(n);
    }

    @Override
    public void markAllAsRead(Long patientId) {
        Query query = new Query(Criteria.where("patient.$id").is(patientId).and("lu").is(false));
        Update update = new Update().set("lu", true);
        mongoTemplate.updateMulti(query, update, Notificationpatient.class);
    }

    @Override
    public Map<String, Long> getUnreadCount(Long patientId) {
        long count = notificationRepository.countByPatient_IdAndIsReadFalse(patientId);
        return Map.of("count", count);
    }
}
