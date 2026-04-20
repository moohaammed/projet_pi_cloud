package esprit.tn.geo.services.geo;

import esprit.tn.geo.entities.geo.GeoAlert;
import esprit.tn.geo.entities.geo.TypeAlerte;
import esprit.tn.geo.repositories.geo.GeoAlertRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class GeoAlertService {

    @Autowired private GeoAlertRepository alertRepository;

    public List<GeoAlert> getAll() {
        return alertRepository.findAll();
    }

    public List<GeoAlert> getByPatient(Long patientId) {
        return alertRepository.findByPatientIdOrderByDeclencheeAtDesc(patientId);
    }

    public List<GeoAlert> getNonResolues() {
        return alertRepository.findByResolue(false);
    }

    public GeoAlert resoudre(String id) {
        GeoAlert alert = alertRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Alerte non trouvée"));
        alert.setResolue(true);
        alert.setResolueAt(LocalDateTime.now());
        return alertRepository.save(alert);
    }

    public GeoAlert creerAlerteSOS(Long patientId, Double latitude, Double longitude) {
        GeoAlert alert = new GeoAlert();
        alert.setPatientId(patientId);
        alert.setTypeAlerte(TypeAlerte.SOS);
        alert.setMessage("🆘 Alerte SOS déclenchée !");
        alert.setLatitude(latitude);
        alert.setLongitude(longitude);
        alert.setResolue(false);
        alert.setDeclencheeAt(LocalDateTime.now());
        return alertRepository.save(alert);
    }

    public GeoAlert confirmerVu(String id) {
        GeoAlert alert = alertRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Alerte non trouvée"));
        alert.setResolue(true);
        alert.setResolueAt(LocalDateTime.now());
        return alertRepository.save(alert);
    }
}
