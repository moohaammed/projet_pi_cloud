package esprit.tn.patientmedecin.services;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;
import java.util.*;

@Service
public class FcmService {

    private final String FCM_URL = "https://fcm.googleapis.com/v1/projects/alzcare-469d1/messages:send";
    private final String SERVER_ACCESS_TOKEN = "PLACEHOLDER_SERVER_ACCESS_TOKEN"; // Should be retrieved via OAuth2

    public void sendPushNotification(String token, String title, String body, Long scanId) {
        if (token == null || token.isEmpty()) return;

        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(SERVER_ACCESS_TOKEN);

        Map<String, Object> message = new HashMap<>();
        Map<String, Object> notification = new HashMap<>();
        notification.put("title", title);
        notification.put("body", body);

        Map<String, Object> webpush = new HashMap<>();
        Map<String, Object> fcmOptions = new HashMap<>();
        fcmOptions.put("link", "/patient/results/" + scanId);
        webpush.put("fcm_options", fcmOptions);

        Map<String, Object> messageContent = new HashMap<>();
        messageContent.put("token", token);
        messageContent.put("notification", notification);
        messageContent.put("webpush", webpush);

        message.put("message", messageContent);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(message, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(FCM_URL, request, String.class);
            System.out.println("FCM Response: " + response.getBody());
        } catch (Exception e) {
            System.err.println("Error sending FCM notification: " + e.getMessage());
        }
    }
}
