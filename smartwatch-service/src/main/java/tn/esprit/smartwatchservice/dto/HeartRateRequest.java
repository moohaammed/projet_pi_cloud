package tn.esprit.smartwatchservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for incoming heart-rate POST requests.
 * The recordedAt timestamp is intentionally excluded —
 * it is always generated server-side for data integrity.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HeartRateRequest {

    private Long userId;

    private String deviceName;

    private Integer bpm;
}
