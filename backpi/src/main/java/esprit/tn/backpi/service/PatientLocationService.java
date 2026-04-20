package esprit.tn.backpi.service;

import esprit.tn.backpi.entity.*;
import esprit.tn.backpi.entity.GeoAlert;
import esprit.tn.backpi.entity.PatientLocation;
import esprit.tn.backpi.entity.TypeAlerte;
import esprit.tn.backpi.entity.User;
import esprit.tn.backpi.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class PatientLocationService {

    @Autowired private PatientLocationRepository locationRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private GeoAlertRepository alertRepository;

    // Enregistrer position GPS
    public PatientLocation saveLocation(Long patientId, Double lat,
                                        Double lng, Integer batterie) {
        User patient = userRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient non trouvé"));

        PatientLocation location = new PatientLocation();
        location.setPatient(patient);
        location.setLatitude(lat);
        location.setLongitude(lng);
        location.setBatterie(batterie);
        location.setTimestamp(LocalDateTime.now());

        PatientLocation saved = locationRepository.save(location);

        // Alerte batterie faible
        if (batterie != null && batterie <= 20) {
            createAlert(patient, TypeAlerte.BATTERIE_FAIBLE,
                    lat, lng, "Batterie faible : " + batterie + "%");
        }

        return saved;
    }

    // Dernière position d'un patient
    public Optional<PatientLocation> getLastLocation(Long patientId) {
        User patient = userRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient non trouvé"));
        return locationRepository.findTopByPatientOrderByTimestampDesc(patient);
    }

    // Historique des positions
    public List<PatientLocation> getHistory(Long patientId) {
        return locationRepository.findByPatient_Id(patientId);
    }

/* 
    private void checkZones(User patient, Double lat, Double lng) {
        // ← Remplace ifPresent par une boucle sur la liste
        List<SafeZone> zones = safeZoneRepository.findByPatient_IdAndActifTrue(patient.getId());

        for (SafeZone zone : zones) {
            double distance = calculateDistance(
                    lat, lng,
                    zone.getLatitudeCentre(),
                    zone.getLongitudeCentre()
            );

            if (distance > zone.getRayonRouge()) {
                createAlert(patient, TypeAlerte.HORS_ZONE_ROUGE, lat, lng,
                        "URGENT ! Patient hors zone rouge à " + (int)distance + "m du centre");
            } else if (distance > zone.getRayonVert()) {
                createAlert(patient, TypeAlerte.HORS_ZONE_VERTE, lat, lng,
                        "Patient hors zone verte à " + (int)distance + "m du centre");
            }
        }
    }
*/
    // Calcul distance en mètres (formule Haversine)
    public double calculateDistance(double lat1, double lng1,
                                    double lat2, double lng2) {
        final int R = 6371000; // rayon Terre en mètres
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat/2) * Math.sin(dLat/2)
                + Math.cos(Math.toRadians(lat1))
                * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng/2) * Math.sin(dLng/2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    private void createAlert(User patient, TypeAlerte type,
                             Double lat, Double lng, String message) {
        GeoAlert alert = new GeoAlert();
        alert.setPatient(patient);
        alert.setTypeAlerte(type);
        alert.setLatitude(lat);
        alert.setLongitude(lng);
        alert.setMessage(message);
        alertRepository.save(alert);
    }
}
