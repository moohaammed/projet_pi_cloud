package esprit.tn.backpi.helpnotification.dto;

import java.time.Instant;

/**
 * Mirror DTO for deserializing HeartRateAlertEvent from the "heartrate.alerts" Kafka topic.
 * Matches the structure published by smartwatch-service's HeartRateAlertProducer.
 */
public class HeartRateAlertEvent {

    private String eventId;
    private Long userId;
    private String deviceName;
    private Integer bpm;
    private String conditionType;
    private String message;
    private String severity;
    private Instant capturedAt;
    private Instant detectedAt;

    public HeartRateAlertEvent() {}

    public HeartRateAlertEvent(String eventId, Long userId, String deviceName, Integer bpm,
                                String conditionType, String message, String severity,
                                Instant capturedAt, Instant detectedAt) {
        this.eventId = eventId;
        this.userId = userId;
        this.deviceName = deviceName;
        this.bpm = bpm;
        this.conditionType = conditionType;
        this.message = message;
        this.severity = severity;
        this.capturedAt = capturedAt;
        this.detectedAt = detectedAt;
    }

    // Getters and Setters

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getDeviceName() { return deviceName; }
    public void setDeviceName(String deviceName) { this.deviceName = deviceName; }

    public Integer getBpm() { return bpm; }
    public void setBpm(Integer bpm) { this.bpm = bpm; }

    public String getConditionType() { return conditionType; }
    public void setConditionType(String conditionType) { this.conditionType = conditionType; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public Instant getCapturedAt() { return capturedAt; }
    public void setCapturedAt(Instant capturedAt) { this.capturedAt = capturedAt; }

    public Instant getDetectedAt() { return detectedAt; }
    public void setDetectedAt(Instant detectedAt) { this.detectedAt = detectedAt; }
}
