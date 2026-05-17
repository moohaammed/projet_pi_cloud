package tn.esprit.smartwatchservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HeartRateLiveStateDto {

    private String eventId;
    private Long userId;
    private String deviceName;
    private Integer bpm;
    private String source;
    private Instant capturedAt;
    private Instant receivedAt;
    private Instant lastReceivedAt;
    private boolean connected;
    private String zone;
}
