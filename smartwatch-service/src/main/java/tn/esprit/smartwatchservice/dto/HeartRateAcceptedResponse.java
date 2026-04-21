package tn.esprit.smartwatchservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO returned by the ingestion endpoint (202 Accepted).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HeartRateAcceptedResponse {

    private String status;
    private String eventId;
    private String message;
}
