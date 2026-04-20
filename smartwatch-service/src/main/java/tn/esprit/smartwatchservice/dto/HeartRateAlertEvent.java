package tn.esprit.smartwatchservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Structured alert event published to the "heartrate.alerts" Kafka topic
 * when a dangerous heart-rate condition is detected.
 *
 * Consumed by backpi's HeartRateHelpNotificationConsumer to trigger
 * the existing help notification workflow.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HeartRateAlertEvent {

    /** Unique alert identifier (UUID) */
    private String eventId;

    /** Patient userId whose heart-rate triggered the alert */
    private Long userId;

    /** Name of the device that captured the reading */
    private String deviceName;

    /** BPM value at the time of detection */
    private Integer bpm;

    /**
     * Type of condition detected.
     * Values: TACHYCARDIE, BRADYCARDIE, VARIATION_ANORMALE,
     *         DONNEE_INCOHERENTE, PIC_SOUDAIN
     */
    private String conditionType;

    /** Human-readable description of the detected condition */
    private String message;

    /** Severity level: WARNING or CRITICAL */
    private String severity;

    /** When the device captured the reading (may be null) */
    private Instant capturedAt;

    /** When the condition was detected by the server */
    private Instant detectedAt;
}
