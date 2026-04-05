package esprit.tn.backpi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BackpiApplication {

    public static void main(String[] args) {
        SpringApplication.run(BackpiApplication.class, args);
    }

}
