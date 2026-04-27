package esprit.tn.geo.services.geo;

import esprit.tn.geo.dto.FastApiHospitalRequest;
import esprit.tn.geo.dto.HospitalPredictionRequest;
import esprit.tn.geo.entities.geo.HospitalPrediction;
import esprit.tn.geo.entities.geo.Incident;
import esprit.tn.geo.entities.geo.RecommendedHospital;
import esprit.tn.geo.repositories.geo.HospitalPredictionRepository;
import esprit.tn.geo.repositories.geo.IncidentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class HospitalPredictionService {
    private final RestTemplate restTemplate;
    private final HospitalPredictionRepository predictionRepository;
    private final IncidentRepository incidentRepository;
    private final String aiHospitalUrl;
    private final String aiHospitalSearchUrl;

    public HospitalPredictionService(
            RestTemplate restTemplate,
            HospitalPredictionRepository predictionRepository,
            IncidentRepository incidentRepository,
            @Value("${alzcare.ai.hospital-url:http://localhost:8000/predict-hospital}") String aiHospitalUrl,
            @Value("${alzcare.ai.hospital-search-url:http://localhost:8000/search-hospitals}") String aiHospitalSearchUrl
    ) {
        this.restTemplate = restTemplate;
        this.predictionRepository = predictionRepository;
        this.incidentRepository = incidentRepository;
        this.aiHospitalUrl = aiHospitalUrl;
        this.aiHospitalSearchUrl = aiHospitalSearchUrl;
    }

    @SuppressWarnings("unchecked")
    public HospitalPrediction predictAndSave(HospitalPredictionRequest request) {
        if (request.getPatientLatitude() == null || request.getPatientLongitude() == null) {
            throw new IllegalArgumentException("Position GPS patient obligatoire.");
        }

        Map<String, Object> response = restTemplate.postForObject(
                aiHospitalUrl,
                new FastApiHospitalRequest(
                        request.getPatientLatitude(),
                        request.getPatientLongitude(),
                        normalizeIncidentType(request.getTypeIncident())
                ),
                Map.class
        );

        List<RecommendedHospital> hospitals = mapHospitals((List<Map<String, Object>>) response.get("hopitaux"));

        HospitalPrediction prediction = new HospitalPrediction();
        prediction.setPatientId(request.getPatientId());
        prediction.setPatientName(request.getPatientName());
        prediction.setIncidentId(request.getIncidentId());
        prediction.setAlertId(request.getAlertId());
        prediction.setTypeIncident(request.getTypeIncident());
        prediction.setPatientLatitude(request.getPatientLatitude());
        prediction.setPatientLongitude(request.getPatientLongitude());
        prediction.setHopitaux(hospitals);
        prediction.setCreatedAt(LocalDateTime.now());
        HospitalPrediction saved = predictionRepository.save(prediction);

        if (request.getIncidentId() != null) {
            incidentRepository.findById(request.getIncidentId()).ifPresent(incident -> {
                incident.setRecommendedHospitals(hospitals);
                if (!hospitals.isEmpty()) {
                    incident.setRecommendedHospitalName(hospitals.get(0).getNom());
                }
                incident.setUpdatedAt(LocalDateTime.now());
                incidentRepository.save(incident);
            });
        }

        return saved;
    }

    public HospitalPrediction getLatestForPatient(Long patientId) {
        return predictionRepository.findFirstByPatientIdOrderByCreatedAtDesc(patientId)
                .orElseThrow(() -> new IllegalArgumentException("Aucune recommandation hospitaliere trouvee."));
    }

    public List<HospitalPrediction> getLatestAlerts() {
        return predictionRepository.findTop20ByOrderByCreatedAtDesc();
    }

    @SuppressWarnings("unchecked")
    public List<RecommendedHospital> searchDataset(String query, Double patientLatitude, Double patientLongitude) {
        return searchDataset(query, patientLatitude, patientLongitude, null);
    }

    @SuppressWarnings("unchecked")
    public List<RecommendedHospital> searchDataset(String query, Double patientLatitude, Double patientLongitude, Integer limit) {
        UriComponentsBuilder builder = UriComponentsBuilder
                .fromHttpUrl(aiHospitalSearchUrl)
                .queryParam("query", query == null ? "" : query);

        if (patientLatitude != null && patientLongitude != null) {
            builder.queryParam("patient_latitude", patientLatitude);
            builder.queryParam("patient_longitude", patientLongitude);
        }
        if (limit != null) {
            builder.queryParam("limit", limit);
        }

        Map<String, Object> response = restTemplate.getForObject(
                builder.toUriString(),
                Map.class
        );

        if (response == null) return List.of();
        return mapHospitals((List<Map<String, Object>>) response.get("hopitaux"));
    }

    private List<RecommendedHospital> mapHospitals(List<Map<String, Object>> rows) {
        List<RecommendedHospital> result = new ArrayList<>();
        if (rows == null) return result;
        for (Map<String, Object> row : rows) {
            RecommendedHospital hospital = new RecommendedHospital();
            hospital.setNom(asString(row.get("nom")));
            hospital.setGouvernorat(asString(row.get("gouvernorat")));
            hospital.setDistanceKm(asString(row.get("distance_km")));
            hospital.setSpecialite(asString(row.get("specialite")));
            hospital.setTelephone(asString(row.get("telephone")));
            hospital.setAdresse(asString(row.get("adresse")));
            hospital.setLatitude(asDouble(row.get("latitude")));
            hospital.setLongitude(asDouble(row.get("longitude")));
            hospital.setRecommande(Boolean.TRUE.equals(row.get("recommande")));
            result.add(hospital);
        }
        return result;
    }

    private String normalizeIncidentType(String type) {
        if (type == null) return "malaise";
        String normalized = type.trim().toLowerCase();
        if (normalized.contains("chute")) return "chute";
        if (normalized.contains("agitation")) return "agitation";
        if (normalized.contains("fugue") || normalized.contains("zone")) return "fugue";
        if (normalized.contains("malaise")) return "malaise";
        if (normalized.contains("accident")) return "chute";
        return normalized;
    }

    private String asString(Object value) {
        return value == null ? "" : value.toString();
    }

    private Double asDouble(Object value) {
        return value instanceof Number ? ((Number) value).doubleValue() : Double.valueOf(value.toString());
    }
}
