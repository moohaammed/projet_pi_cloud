package esprit.tn.backpi.service;

import esprit.tn.backpi.entity.GeoAlert;
import esprit.tn.backpi.entity.TypeAlerte;
import esprit.tn.backpi.entity.User;
import esprit.tn.backpi.repository.GeoAlertRepository;
import esprit.tn.backpi.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class GeoAlertService {

    @Autowired private GeoAlertRepository alertRepository;
    @Autowired private UserRepository userRepository;

    public List<GeoAlert> getAll() {
        return alertRepository.findAll();
    }

    public List<GeoAlert> getByPatient(Long patientId) {
        return alertRepository.findByPatient_IdOrderByDeclencheeAtDesc(patientId);
    }

    public List<GeoAlert> getNonResolues() {
        return alertRepository.findByResolue(false);
    }

    public GeoAlert resoudre(Long id) {
        GeoAlert alert = alertRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Alerte non trouvée"));
        alert.setResolue(true);
        alert.setResolueAt(LocalDateTime.now());
        return alertRepository.save(alert);
    }
    public GeoAlert creerAlerteSOS(Long patientId, Double latitude, Double longitude) {
        GeoAlert alert = new GeoAlert();

        // Récupère le user (patient)
        User patient = userRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient non trouvé"));

        alert.setPatient(patient);
        alert.setTypeAlerte(TypeAlerte.SOS); // ← vérifie que SOS existe dans TypeAlerte
        alert.setMessage("🆘 Alerte SOS déclenchée !");
        alert.setLatitude(latitude);
        alert.setLongitude(longitude);
        alert.setResolue(false);
        alert.setDeclencheeAt(LocalDateTime.now());

        return alertRepository.save(alert);
    }
    public GeoAlert confirmerVu(Long id) {
        GeoAlert alert = alertRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Alerte non trouvée"));
        alert.setResolue(true);
        alert.setResolueAt(LocalDateTime.now());
        return alertRepository.save(alert);
    }
}
