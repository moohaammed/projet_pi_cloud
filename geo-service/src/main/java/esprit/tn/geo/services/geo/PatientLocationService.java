package esprit.tn.geo.services.geo;

import esprit.tn.geo.entities.geo.GeoAlert;
import esprit.tn.geo.entities.geo.PatientLocation;
import esprit.tn.geo.entities.geo.SafeZone;
import esprit.tn.geo.entities.geo.TypeAlerte;
import esprit.tn.geo.dto.HospitalPredictionRequest;
import esprit.tn.geo.repositories.geo.GeoAlertRepository;
import esprit.tn.geo.repositories.geo.PatientLocationRepository;
import esprit.tn.geo.repositories.geo.SafeZoneRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class PatientLocationService {

    @Autowired private PatientLocationRepository locationRepository;

    @Autowired private SafeZoneRepository safeZoneRepository;

    @Autowired private GeoAlertRepository alertRepository;

    @Autowired private HospitalPredictionService hospitalPredictionService;

    /**
     * Enregistrer la position GPS d'un patient.
     * patientId est l'ID de l'utilisateur dans backpi.
     */
    public PatientLocation saveLocation(Long patientId, Double lat,
                                        Double lng, Integer batterie) {
        PatientLocation location = new PatientLocation();
        location.setPatientId(patientId);
        location.setLatitude(lat);
        location.setLongitude(lng);
        location.setBatterie(batterie);
        location.setTimestamp(LocalDateTime.now());

        PatientLocation saved = locationRepository.save(location);

        // Vérification automatique des zones sûres
        checkZones(patientId, lat, lng);

        // Alerte batterie faible
        if (batterie != null && batterie <= 20) {
            createAlert(patientId, TypeAlerte.BATTERIE_FAIBLE,
                    lat, lng, "Batterie faible : " + batterie + "%");
        }

        return saved;
    }

    // Dernière position d'un patient
    public Optional<PatientLocation> getLastLocation(Long patientId) {
        return locationRepository.findTopByPatientIdOrderByTimestampDesc(patientId);
    }

    // Historique des positions
    public List<PatientLocation> getHistory(Long patientId) {
        return locationRepository.findByPatientId(patientId);
    }

    private void checkZones(Long patientId, Double lat, Double lng) {
        List<SafeZone> zones = safeZoneRepository.findByPatientIdAndActifTrue(patientId);

        for (SafeZone zone : zones) {
            double distance = calculateDistance(
                    lat, lng,
                    zone.getLatitudeCentre(),
                    zone.getLongitudeCentre()
            );

            if (distance > zone.getRayonRouge()) {
                GeoAlert alert = createAlert(patientId, TypeAlerte.HORS_ZONE_ROUGE, lat, lng,
                        "URGENT ! Patient hors zone rouge à " + (int) distance + "m du centre");
                predictHospitalForAlert(alert, "fugue");
            } else if (distance > zone.getRayonVert()) {
                GeoAlert alert = createAlert(patientId, TypeAlerte.HORS_ZONE_VERTE, lat, lng,
                        "Patient hors zone verte à " + (int) distance + "m du centre");
                predictHospitalForAlert(alert, "fugue");
            }
        }
    }
    // Calcul distance en mètres (formule Haversine)
    public double calculateDistance(double lat1, double lng1,
                                    double lat2, double lng2) {
        final int R = 6371000; // rayon Terre en mètres
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1))
                * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private GeoAlert createAlert(Long patientId, TypeAlerte type,
                              Double lat, Double lng, String message) {
        GeoAlert alert = new GeoAlert();
        alert.setPatientId(patientId);
        alert.setTypeAlerte(type);
        alert.setLatitude(lat);
        alert.setLongitude(lng);
        alert.setMessage(message);
        return alertRepository.save(alert);
    }

    private void predictHospitalForAlert(GeoAlert alert, String typeIncident) {
        if (alert.getLatitude() == null || alert.getLongitude() == null) return;
        try {
            HospitalPredictionRequest request = new HospitalPredictionRequest();
            request.setPatientId(alert.getPatientId());
            request.setAlertId(alert.getId());
            request.setPatientLatitude(alert.getLatitude());
            request.setPatientLongitude(alert.getLongitude());
            request.setTypeIncident(typeIncident);
            hospitalPredictionService.predictAndSave(request);
        } catch (Exception e) {
            System.err.println("[HospitalPrediction] Erreur prediction alerte " + alert.getId() + ": " + e.getMessage());
        }
    }
}
