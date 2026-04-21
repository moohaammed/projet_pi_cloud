package tn.esprit.smartwatchservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * DTO for streaming heart-rate data to the frontend via SSE.
 * Contains exactly the fields the UI needs for live display.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HeartRateViewDto {

    private String eventId;
    private Long userId;
    private String deviceName;
    private Integer bpm;
    private String source;
    private Instant capturedAt;
    private Instant receivedAt;
}
