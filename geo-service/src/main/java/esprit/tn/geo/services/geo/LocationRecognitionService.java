package esprit.tn.geo.services.geo;

import esprit.tn.geo.dto.IncidentRequest;
import esprit.tn.geo.dto.LocationPredictionRequest;
import esprit.tn.geo.dto.LocationPredictionResponse;
import esprit.tn.geo.entities.geo.Incident;
import esprit.tn.geo.entities.geo.LocationRecognition;
import esprit.tn.geo.entities.geo.PatientLocation;
import esprit.tn.geo.entities.geo.SafeZone;
import esprit.tn.geo.repositories.geo.LocationRecognitionRepository;
import esprit.tn.geo.repositories.geo.PatientLocationRepository;
import esprit.tn.geo.repositories.geo.SafeZoneRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class LocationRecognitionService {
    private final RestTemplate restTemplate;
    private final IncidentService incidentService;
    private final LocationRecognitionRepository locationRepository;
    private final PatientLocationRepository patientLocationRepository;
    private final SafeZoneRepository safeZoneRepository;
    private final String aiUrl;

    public LocationRecognitionService(
            RestTemplate restTemplate,
            IncidentService incidentService,
            LocationRecognitionRepository locationRepository,
            PatientLocationRepository patientLocationRepository,
            SafeZoneRepository safeZoneRepository,
            @Value("${alzcare.ai.location-url:http://localhost:8000/predict-location}") String aiUrl
    ) {
        this.restTemplate = restTemplate;
        this.incidentService = incidentService;
        this.locationRepository = locationRepository;
        this.patientLocationRepository = patientLocationRepository;
        this.safeZoneRepository = safeZoneRepository;
        this.aiUrl = aiUrl;
    }

    public LocationPredictionResponse predict(LocationPredictionRequest request) {
        if (request.getImage() == null || request.getImage().isBlank()) {
            throw new IllegalArgumentException("La photo base64 est obligatoire.");
        }
        if (request.getPatientId() == null) {
            throw new IllegalArgumentException("patientId est obligatoire.");
        }

        Map<String, Object> aiRequest = Map.of(
                "image", request.getImage(),
                "patient_id", request.getPatientId()
        );

        LocationPredictionResponse response = restTemplate.postForObject(
                aiUrl,
                aiRequest,
                LocationPredictionResponse.class
        );

        if (response == null) {
            throw new IllegalStateException("Le service IA n'a pas renvoye de resultat.");
        }

        response.setPatientId(request.getPatientId());
        response.setDate(LocalDateTime.now());

        PatientLocation lastLocation = patientLocationRepository
                .findTopByPatientIdOrderByTimestampDesc(request.getPatientId())
                .orElse(null);

        String incidentId = null;
        if ("ZONE_INCONNUE".equals(response.getStatut()) && isInRedZone(request.getPatientId(), lastLocation)) {
            Incident incident = incidentService.creerIncident(buildIncidentRequest(request, response, lastLocation));
            incidentId = incident.getId();
            response.setIncidentId(incidentId);
        }

        LocationRecognition saved = new LocationRecognition();
        saved.setPatientId(request.getPatientId());
        saved.setLieu(response.getLieu());
        saved.setConfiance(response.getConfiance());
        saved.setConfidenceScore(parseConfidence(response.getConfiance()));
        saved.setStatut(response.getStatut());
        saved.setPhoto(request.getImage());
        saved.setIncidentId(incidentId);
        saved.setDate(response.getDate());
        locationRepository.save(saved);

        return response;
    }

    public LocationRecognition getCurrent(Long patientId) {
        return locationRepository.findFirstByPatientIdOrderByDateDesc(patientId)
                .orElseThrow(() -> new IllegalArgumentException("Aucune localisation trouvee pour ce patient."));
    }

    public List<LocationRecognition> getHistory(Long patientId) {
        return locationRepository.findTop20ByPatientIdOrderByDateDesc(patientId);
    }

    private IncidentRequest buildIncidentRequest(
            LocationPredictionRequest request,
            LocationPredictionResponse response,
            PatientLocation lastLocation
    ) {
        IncidentRequest incident = new IncidentRequest();
        incident.setReporterId(request.getReporterId() != null ? request.getReporterId() : request.getPatientId());
        incident.setPatientId(request.getPatientId());
        incident.setAiAnalysis("unknown location");
        incident.setAiConfidence(parseConfidence(response.getConfiance()));
        incident.setMedia(request.getImage());
        if (lastLocation != null) {
            incident.setLatitude(lastLocation.getLatitude());
            incident.setLongitude(lastLocation.getLongitude());
        }
        return incident;
    }

    private boolean isInRedZone(Long patientId, PatientLocation location) {
        if (location == null || location.getLatitude() == null || location.getLongitude() == null) {
            return false;
        }

        List<SafeZone> zones = safeZoneRepository.findByPatientIdAndActifTrue(patientId);
        if (zones.isEmpty()) {
            return false;
        }

        for (SafeZone zone : zones) {
            if (zone.getLatitudeCentre() == null || zone.getLongitudeCentre() == null || zone.getRayonRouge() == null) {
                continue;
            }
            double distance = calculateDistance(
                    location.getLatitude(),
                    location.getLongitude(),
                    zone.getLatitudeCentre(),
                    zone.getLongitudeCentre()
            );
            if (distance > zone.getRayonRouge()) {
                return true;
            }
        }
        return false;
    }

    private double calculateDistance(double lat1, double lng1, double lat2, double lng2) {
        final int earthRadius = 6371000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1))
                * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadius * c;
    }

    private double parseConfidence(String confiance) {
        if (confiance == null || confiance.isBlank()) {
            return 0.0;
        }
        String numeric = confiance.replace("%", "").trim().replace(",", ".");
        try {
            return Double.parseDouble(numeric) / 100.0;
        } catch (NumberFormatException ignored) {
            return 0.0;
        }
    }
}
