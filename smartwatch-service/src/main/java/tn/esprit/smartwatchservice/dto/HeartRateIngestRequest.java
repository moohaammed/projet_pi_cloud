package tn.esprit.smartwatchservice.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for the async ingestion endpoint (POST /api/heart-rate/ingest).
 * The legacy dev collector sends userId directly. The token-based collector
 * omits userId and lets the backend resolve it from Authorization: Bearer.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HeartRateIngestRequest {

    private Long userId;

    private String eventId;

    @NotBlank(message = "deviceName is required")
    private String deviceName;

    @NotNull(message = "bpm is required")
    @Min(value = 30, message = "bpm must be at least 30")
    @Max(value = 220, message = "bpm must be at most 220")
    private Integer bpm;

    /** Source identifier (e.g. "BLE_CLIENT"). Defaults to "UNKNOWN" if absent. */
    private String source;

    /** ISO-8601 timestamp when the device captured the reading (optional). */
    private String capturedAt;
}
