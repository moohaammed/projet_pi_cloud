package tn.esprit.smartwatchservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * DTO representing the current AI prediction state for a given user.
 *
 * Possible statuses:
 *   - WAITING  → fewer than 60 readings collected
 *   - READY    → prediction available
 *   - ERROR    → inference or metadata retrieval failed
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HeartRateAiResultDto {

    private Long userId;

    /** WAITING | READY | ERROR */
    private String status;

    /** Number of BPM readings collected so far */
    private int readingsCollected;

    /** Total readings required before prediction (always 60) */
    private int readingsRequired;

    // ─── Fields populated only when status == READY ──────────────

    /** NORMAL or PRE_CRISE */
    private String prediction;

    /** Crisis probability [0.0, 1.0] */
    private Double probability;

    /** NORMAL / ATTENTION / SURVEILLANCE / ALERTE */
    private String riskLevel;

    /** Recommended action text */
    private String action;

    /** Current BPM at prediction time */
    private Double bpmCurrent;

    /** Average BPM over the 60-read window */
    private Double bpmMean;

    // ─── Fields populated when status == ERROR ───────────────────

    /** Human-readable error message */
    private String errorMessage;

    /** When this result was produced */
    private Instant timestamp;
}
