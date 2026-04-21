package esprit.tn.patientmedecin.services;

import esprit.tn.patientmedecin.entities.Analyse;
import esprit.tn.patientmedecin.entities.Notificationpatient;
import esprit.tn.patientmedecin.repositories.AnalyseRepository;
import esprit.tn.patientmedecin.repositories.PatientNotificationRepository;
import esprit.tn.patientmedecin.sequence.SequenceGeneratorService;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AnalyseServiceImpl implements IAnalyseService {

    private final AnalyseRepository analyseRepository;
    private final FcmService fcmService;
    private final PatientNotificationRepository notificationRepository;
    private final SequenceGeneratorService sequenceGenerator;

    public AnalyseServiceImpl(AnalyseRepository analyseRepository, 
                              FcmService fcmService,
                              PatientNotificationRepository notificationRepository,
                              SequenceGeneratorService sequenceGenerator) {
        this.analyseRepository = analyseRepository;
        this.fcmService = fcmService;
        this.notificationRepository = notificationRepository;
        this.sequenceGenerator = sequenceGenerator;
    }

    @Override
    public List<Analyse> retrieveAllAnalyses() {
        return analyseRepository.findAll();
    }

    @Override
    public Analyse addAnalyse(Analyse a) {
        if (a.getId() == null) {
            a.setId(sequenceGenerator.generateSequence(Analyse.SEQUENCE_NAME));
        }

        Analyse saved = analyseRepository.save(a);
        
        // Trigger patient notification based on risk percentage
        if (saved.getPatient() != null) {
            Notificationpatient notif = new Notificationpatient();
            notif.setId(sequenceGenerator.generateSequence(Notificationpatient.SEQUENCE_NAME));
            notif.setPatient(saved.getPatient());
            notif.setCreatedAt(LocalDateTime.now());
            
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
        return analyseRepository.findByPatient_Id(patientId);
    }
}
