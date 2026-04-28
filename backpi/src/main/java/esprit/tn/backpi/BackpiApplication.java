package esprit.tn.backpi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootApplication
@EnableScheduling
public class BackpiApplication {

    public static void main(String[] args) {
        SpringApplication.run(BackpiApplication.class, args);
    }

    @Bean
    public org.springframework.web.client.RestTemplate restTemplate() {
        return new org.springframework.web.client.RestTemplate();
    }

    @Bean
    public CommandLineRunner fixDatabaseSchema(JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                jdbcTemplate.execute("ALTER TABLE analyse MODIFY observation_medicale LONGTEXT;");
                System.out.println("✅ DATABASE FIX: observation_medicale column is now LONGTEXT");
            } catch (Exception e) {
                System.err.println("⚠️ DATABASE FIX SKIPPED: " + e.getMessage());
            }
        };
    }
}
