package esprit.tn.rendezvous;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class RendezvousApplication {
    public static void main(String[] args) {
        SpringApplication.run(RendezvousApplication.class, args);
    }
}
