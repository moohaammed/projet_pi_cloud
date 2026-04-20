package esprit.tn.backpi.services.gestion_patient;

import esprit.tn.backpi.entities.gestion_patient.Analyse;
import esprit.tn.backpi.repositories.gestion_patient.AnalyseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AnalyseServiceImpl implements IAnalyseService {

    private final AnalyseRepository analyseRepository;
    private final esprit.tn.backpi.service.FcmService fcmService;
    private final esprit.tn.backpi.repositories.gestion_patient.PatientNotificationRepository notificationRepository;

    public AnalyseServiceImpl(AnalyseRepository analyseRepository, 
                              esprit.tn.backpi.service.FcmService fcmService,
                              esprit.tn.backpi.repositories.gestion_patient.PatientNotificationRepository notificationRepository) {
        this.analyseRepository = analyseRepository;
        this.fcmService = fcmService;
        this.notificationRepository = notificationRepository;
    }

    @Override
    public List<Analyse> retrieveAllAnalyses() {
        return analyseRepository.findAll();
    }

    @Override
    public Analyse addAnalyse(Analyse a) {
        Analyse saved = analyseRepository.save(a);
        
        // Trigger patient notification based on risk percentage
        if (saved.getPatient() != null) {
            esprit.tn.backpi.entities.gestion_patient.Notificationpatient notif = new esprit.tn.backpi.entities.gestion_patient.Notificationpatient();
            notif.setPatient(saved.getPatient());
            
            double risk = (saved.getPourcentageRisque() != null) ? saved.getPourcentageRisque() : 0.0;
            
            if (risk >= 70) {
                notif.setType("URGENT");
                notif.setMessage("⚠️ Votre score de risque est élevé. Consultez votre médecin immédiatement.");
            } else if (risk >= 40) {
                notif.setType("RAPPEL_MEDICAL");
                notif.setMessage("📋 Pensez à uploader un nouveau rapport IRM.");
            } else {
                notif.setType("INFO");
                notif.setMessage("✅ Votre état est stable. Refaites un test dans 60 jours.");
            }
            
            notificationRepository.save(notif);
        }
        
        return saved;
    }

    @Override
    public Analyse updateAnalyse(Analyse a) {
        Analyse updated = analyseRepository.save(a);
        
        // Trigger push notification if interpretation is present
        if (updated.getInterpretation() != null && !updated.getInterpretation().isEmpty()) {
            if (updated.getPatient() != null && updated.getPatient().getUser() != null) {
                String token = updated.getPatient().getUser().getFcmToken();
                String patientName = updated.getPatient().getPrenom();
                fcmService.sendPushNotification(
                    token, 
                    "AlzCare — Nouvelle réponse", 
                    "Votre médecin a analysé votre scan IRM. Consultez votre espace patient.",
                    updated.getId()
                );
            }
        }
        
        return updated;
    }

    @Override
    public Analyse retrieveAnalyse(Long id) {
        return analyseRepository.findById(id).orElse(null);
    }

    @Override
    public void removeAnalyse(Long id) {
        analyseRepository.deleteById(id);
    }

    @Override
    public List<Analyse> retrieveAnalysesByPatient(Long patientId) {
        return analyseRepository.findByPatientId(patientId);
    }
}
