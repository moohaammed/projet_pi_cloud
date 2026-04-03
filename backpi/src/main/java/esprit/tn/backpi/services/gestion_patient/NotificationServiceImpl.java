package esprit.tn.backpi.services.gestion_patient;

import esprit.tn.backpi.entities.gestion_patient.Notificationpatient;
import esprit.tn.backpi.repositories.gestion_patient.PatientNotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements INotificationService {

    private final PatientNotificationRepository notificationRepository;

    @Override
    public List<Notificationpatient> retrieveAllNotifications() {
        return notificationRepository.findAll();
    }

    @Override
    public Notificationpatient addNotification(Notificationpatient n) {
        return notificationRepository.save(n);
    }

    @Override
    public Notificationpatient updateNotification(Notificationpatient n) {
        return notificationRepository.save(n);
    }

    @Override
    public Notificationpatient retrieveNotification(Long id) {
        return notificationRepository.findById(id).orElse(null);
    }

    @Override
    public void removeNotification(Long id) {
        notificationRepository.deleteById(id);
    }
}
