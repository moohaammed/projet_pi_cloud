package esprit.tn.geo.client;

import esprit.tn.geo.dto.UserDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

/**
 * Feign Client pour communiquer avec le service backpi (gestion des utilisateurs).
 * Utilise le nom du service Eureka "backpi".
 */
@FeignClient(name = "backpi")
public interface UserClient {

    @GetMapping("/api/users/{id}")
    UserDTO getUserById(@PathVariable("id") Long id);
}
