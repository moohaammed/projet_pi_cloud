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

    // ── REMOVED: JdbcTemplate CommandLineRunner ──────────────────────────────
    // The ALTER TABLE SQL statement that modified the 'analyse' table in MySQL
    // is no longer needed: backpi now persists to MongoDB Atlas.
    // The patient-medecin-service (which owns the 'analyses' collection) manages
    // its own schema independently.
}
