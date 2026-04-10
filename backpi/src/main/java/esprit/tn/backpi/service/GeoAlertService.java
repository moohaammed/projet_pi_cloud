package esprit.tn.backpi.service;

import esprit.tn.backpi.entity.GeoAlert;
import esprit.tn.backpi.repository.GeoAlertRepository;
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
}
