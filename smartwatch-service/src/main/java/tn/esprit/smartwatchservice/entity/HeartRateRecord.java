package tn.esprit.smartwatchservice.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "heart_rate_records")
public class HeartRateRecord {

    @Id
    private String id;

    private Long userId;

    private String deviceName;

    private Integer bpm;

    private LocalDateTime recordedAt;
}
