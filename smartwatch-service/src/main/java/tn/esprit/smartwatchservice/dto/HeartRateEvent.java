package tn.esprit.smartwatchservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Internal Kafka event schema published to the "heartrate.raw" topic.
 * This is the canonical heart-rate event representation used across
 * all internal consumers (persistence, streaming, future alerts).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HeartRateEvent {

    /** Unique event identifier (UUID) */
    private String eventId;

    private Long userId;

    private String deviceName;

    private Integer bpm;

    /** Origin of the reading (e.g. "BLE_CLIENT") */
    private String source;

    /** When the device captured the reading (may be null if not provided) */
    private Instant capturedAt;

    /** When the server received and accepted the reading */
    private Instant receivedAt;
}
