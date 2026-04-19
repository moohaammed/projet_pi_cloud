package tn.esprit.smartwatchservice.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "heart_rate_records")
public class HeartRateRecord {

    @Id
    private String id;

    /** Unique event identifier (UUID assigned at ingestion) */
    private String eventId;

    private Long userId;

    private String deviceName;

    private Integer bpm;

    /** Source of the reading (e.g. "BLE_CLIENT") */
    private String source;

    /** Timestamp when the BLE device actually captured the reading (optional) */
    private Instant capturedAt;

    /** Timestamp when the server received and recorded the reading */
    private Instant receivedAt;

    /**
     * Legacy field — kept for backward compatibility with existing queries.
     * New code should use {@link #receivedAt} instead.
     */
    private LocalDateTime recordedAt;
}
