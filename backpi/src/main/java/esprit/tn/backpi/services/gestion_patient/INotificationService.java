package esprit.tn.backpi.services.gestion_patient;

import esprit.tn.backpi.entities.gestion_patient.Notificationpatient;
import esprit.tn.backpi.entities.gestion_patient.Notificationpatient;

import java.util.List;

public interface INotificationService {
    List<Notificationpatient> retrieveAllNotifications();

    Notificationpatient addNotification(Notificationpatient n);

    Notificationpatient updateNotification(Notificationpatient n);

    Notificationpatient retrieveNotification(Long id);

    void removeNotification(Long id);
}
