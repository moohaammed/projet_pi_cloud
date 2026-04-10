package esprit.tn.collab.clients;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Calls the main backpi service for user data.
 * Uses lb://backpi so Eureka resolves the actual host:port — no hardcoded URL.
 */
@Component
public class UserClient {

    private static final String BASE = "http://backpi/api/users";

    private final RestTemplate restTemplate;

    // Inject the @LoadBalanced RestTemplate from RestTemplateConfig
    public UserClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getUserById(Long userId) {
        try {
            return restTemplate.getForObject(BASE + "/" + userId, Map.class);
        } catch (Exception e) {
            return Map.of("id", userId, "nom", "", "prenom", "User " + userId, "role", "UNKNOWN", "actif", true);
        }
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getAllUsers() {
        try {
            return restTemplate.getForObject(BASE, List.class);
        } catch (Exception e) {
            return List.of();
        }
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getUsersByRole(String role) {
        try {
            return restTemplate.getForObject(BASE + "/role/" + role, List.class);
        } catch (Exception e) {
            return List.of();
        }
    }

    public String getFullName(Map<String, Object> user) {
        if (user == null) return "Unknown";
        String prenom = (String) user.getOrDefault("prenom", "");
        String nom = (String) user.getOrDefault("nom", "");
        String full = (prenom + " " + nom).trim();
        return full.isEmpty() ? "User " + user.get("id") : full;
    }

    public boolean isRole(Map<String, Object> user, String role) {
        if (user == null) return false;
        return role.equalsIgnoreCase((String) user.getOrDefault("role", ""));
    }

    public boolean isActive(Map<String, Object> user) {
        if (user == null) return false;
        Object actif = user.get("actif");
        return actif instanceof Boolean b ? b : Boolean.parseBoolean(String.valueOf(actif));
    }
}
