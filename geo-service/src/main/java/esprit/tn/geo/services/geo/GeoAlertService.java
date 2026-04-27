package esprit.tn.geo.services.geo;

import esprit.tn.geo.entities.geo.GeoAlert;
import esprit.tn.geo.entities.geo.TypeAlerte;
import esprit.tn.geo.repositories.geo.GeoAlertRepository;
import esprit.tn.geo.services.geo.SmsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class GeoAlertService {

    @Autowired private GeoAlertRepository alertRepository;
    @Autowired private SmsService          smsService;

    @Value("${backpi.url:http://localhost:8082}")
    private String backpiUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public List<GeoAlert> getAll() {
        return alertRepository.findAll();
    }

    public List<GeoAlert> getByPatient(Long patientId) {
        return alertRepository.findByPatientIdOrderByDeclencheeAtDesc(patientId);
    }

    public List<GeoAlert> getNonResolues() {
        return alertRepository.findByResolue(false);
    }

    // ── CORRIGE : resoudre ne crée plus d'alerte ─────────────────
    public GeoAlert resoudre(String id) {
        GeoAlert alert = alertRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Alerte non trouvee"));
        alert.setResolue(true);
        alert.setResolueAt(LocalDateTime.now());
        return alertRepository.save(alert);
    }

    public GeoAlert confirmerVu(String id) {
        GeoAlert alert = alertRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Alerte non trouvee"));
        alert.setResolue(true);
        alert.setResolueAt(LocalDateTime.now());
        return alertRepository.save(alert);
    }

    // ── SOS ───────────────────────────────────────────────────────
    public GeoAlert creerAlerteSOS(Long patientId, Double latitude, Double longitude) {
        GeoAlert alert = new GeoAlert();
        alert.setPatientId(patientId);
        alert.setTypeAlerte(TypeAlerte.SOS);
        alert.setMessage("Alerte SOS declenchee !");
        alert.setLatitude(latitude);
        alert.setLongitude(longitude);
        alert.setResolue(false);
        alert.setDeclencheeAt(LocalDateTime.now());
        GeoAlert saved = alertRepository.save(alert);
        envoyerSmsRelation(patientId, TypeAlerte.SOS.name(), latitude, longitude);
        return saved;
    }

    // ── Hors zone verte / rouge ───────────────────────────────────
    public GeoAlert creerAlerteZone(Long patientId, TypeAlerte type,
                                    Double latitude, Double longitude) {
        GeoAlert alert = new GeoAlert();
        alert.setPatientId(patientId);
        alert.setTypeAlerte(type);
        alert.setMessage("Patient hors zone : " + type.name());
        alert.setLatitude(latitude);
        alert.setLongitude(longitude);
        alert.setResolue(false);
        alert.setDeclencheeAt(LocalDateTime.now());
        GeoAlert saved = alertRepository.save(alert);
        envoyerSmsRelation(patientId, type.name(), latitude, longitude);
        return saved;
    }

    // ── SMS relation ──────────────────────────────────────────────
    private void envoyerSmsRelation(Long patientId, String typeAlerte,
                                    Double latitude, Double longitude) {
        try {
            Map<?, ?> patient = restTemplate.getForObject(
                    backpiUrl + "/api/users/" + patientId, Map.class);
            if (patient == null) return;

            String patientNom = patient.get("prenom") + " " + patient.get("nom");

            Object relationIdObj = patient.get("relationId");
            if (relationIdObj == null) {
                System.out.println("[SMS] Pas de relation pour patient " + patientId);
                return;
            }

            Long relationId = Long.valueOf(relationIdObj.toString());

            Map<?, ?> relation = restTemplate.getForObject(
                    backpiUrl + "/api/users/" + relationId, Map.class);
            if (relation == null) return;

            String telephone = (String) relation.get("telephone");
            if (telephone == null || telephone.isBlank()) {
                System.out.println("[SMS] Pas de telephone pour la relation");
                return;
            }

            smsService.envoyerAlertesSms(telephone, patientNom, typeAlerte, latitude, longitude);

        } catch (Exception e) {
            System.err.println("[SMS] Erreur : " + e.getMessage());
        }
    }
}