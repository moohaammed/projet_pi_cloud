package esprit.tn.patientmedecin.services;

import esprit.tn.patientmedecin.entities.Notificationpatient;
import java.util.List;
import java.util.Map;

public interface INotificationService {
    List<Notificationpatient> getLatest(Long patientId);
    void markAsRead(Long id);
    void markAllAsRead(Long patientId);
    Map<String, Long> getUnreadCount(Long patientId);
}
