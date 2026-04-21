package esprit.tn.collab.clients;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Component
public class UserClient {

    private static final String BASE = "http://backpi/api/users";

    private final RestTemplate restTemplate;

    public UserClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getUserById(Long userId) {
        try {
            return restTemplate.getForObject(BASE + "/" + userId, Map.class);
        } catch (Exception e) {
            // Graceful degradation — show "User 42" instead of crashing
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

    public void suspendUser(Long userId) {
        if (userId == null) return;
        try {
            // First check current state — only toggle if currently active
            Map<String, Object> user = getUserById(userId);
            if (isActive(user)) {
                restTemplate.patchForObject(BASE + "/" + userId + "/toggle", null, Map.class);
            }
        } catch (Exception e) {
            System.err.println("UserClient.suspendUser: failed to suspend user " + userId + ": " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    public Map<Long, Map<String, Object>> getUsersByIds(java.util.Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) return Map.of();
        try {
            List<Map<String, Object>> users = restTemplate.postForObject(
                BASE + "/batch", new java.util.ArrayList<>(ids), List.class);
            if (users == null) return Map.of();
            Map<Long, Map<String, Object>> result = new java.util.HashMap<>();
            for (Map<String, Object> u : users) {
                Object idObj = u.get("id");
                if (idObj != null) result.put(((Number) idObj).longValue(), u);
            }
            return result;
        } catch (Exception e) {
            return Map.of();
        }
    }
}
