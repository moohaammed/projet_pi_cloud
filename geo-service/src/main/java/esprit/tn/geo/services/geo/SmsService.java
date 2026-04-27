package esprit.tn.geo.services.geo;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
public class SmsService {

    @Value("${infobip.api-key:}")
    private String apiKey;

    @Value("${infobip.base-url:}")
    private String baseUrl;

    @Value("${infobip.from:AlzCare}")
    private String from;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Envoie un SMS via Infobip
     * Inscription gratuite sur infobip.com → 100 SMS offerts
     */
    public void envoyerAlertesSms(String toNumber, String patientNom,
                                  String typeAlerte, Double latitude, Double longitude) {
        if (toNumber == null || toNumber.isBlank()) {
            System.err.println("[SMS] Numéro manquant");
            return;
        }

        try {
            String emoji = switch (typeAlerte) {
                case "HORS_ZONE_ROUGE" -> "URGENT";
                case "HORS_ZONE_VERTE" -> "Attention";
                case "SOS"             -> "SOS";
                default                -> "Alerte";
            };

            String mapsLink = (latitude != null && longitude != null)
                    ? " Position: https://maps.google.com/?q=" + latitude + "," + longitude
                    : "";

            String body = emoji + " AlzCare: " + patientNom
                    + " - " + typeAlerte
                    + " a " + java.time.LocalTime.now()
                    .format(java.time.format.DateTimeFormatter.ofPattern("HH:mm"))
                    + mapsLink;

            // Payload Infobip
            Map<String, Object> payload = Map.of(
                    "messages", new Object[]{
                            Map.of(
                                    "from", from,
                                    "destinations", new Object[]{ Map.of("to", formatTel(toNumber)) },
                                    "text", body
                            )
                    }
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "App " + apiKey);
            headers.set("Accept", "application/json");

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(
                    baseUrl + "/sms/2/text/advanced", request, String.class
            );

            System.out.println("[SMS Infobip] Envoyé à " + toNumber + " — Status: " + response.getStatusCode());

        } catch (Exception e) {
            System.err.println("[SMS Infobip] Erreur: " + e.getMessage());
        }
    }

    private String formatTel(String tel) {
        if (tel == null) return null;
        tel = tel.replaceAll("[\\s\\-\\(\\)]", "");
        if (tel.startsWith("+")) return tel;
        if (tel.startsWith("216")) return "+" + tel;
        if (tel.startsWith("0")) return "+216" + tel.substring(1);
        return "+216" + tel;
    }
}