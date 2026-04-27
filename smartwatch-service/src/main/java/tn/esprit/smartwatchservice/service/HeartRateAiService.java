package tn.esprit.smartwatchservice.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import tn.esprit.smartwatchservice.dto.HeartRateAiResultDto;
import tn.esprit.smartwatchservice.dto.HeartRateEvent;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Core AI prediction service.
 *
 * Maintains a per-user sliding window of the last 60 BPM readings.
 * When 60 readings are available, fetches patient metadata from backpi
 * and calls the Python inference API to get a prediction.
 *
 * Fault-tolerance:
 * - If backpi is unavailable -> ERROR state, continue consuming
 * - If Python inference API is unavailable -> ERROR state, continue consuming
 * - If patient metadata is incomplete -> ERROR state, continue consuming
 * - Any unexpected exception -> ERROR state, continue consuming
 *
 * This service NEVER throws exceptions to the caller (HeartRateAiConsumer).
 */
@Slf4j
@Service
public class HeartRateAiService {

    private static final int REQUIRED_READINGS = 60;

    /** Per-user sliding window of BPM values */
    private final ConcurrentHashMap<Long, LinkedList<Integer>> userWindows = new ConcurrentHashMap<>();

    /** Per-user timestamp of the last AI-consumed heart-rate event */
    private final ConcurrentHashMap<Long, Instant> lastEventTimestamps = new ConcurrentHashMap<>();

    /** Per-user cached patient metadata */
    private final ConcurrentHashMap<Long, PatientMetadata> metadataCache = new ConcurrentHashMap<>();

    /** Per-user latest AI result (for REST polling) */
    private final ConcurrentHashMap<Long, HeartRateAiResultDto> latestResults = new ConcurrentHashMap<>();

    private final HeartRateAiStreamingService aiStreamingService;
    private final RestTemplate backpiRestTemplate;
    private final RestTemplate inferenceRestTemplate;

    @Value("${heartrate.ai.backpi-url}")
    private String backpiUrl;

    @Value("${heartrate.ai.inference-url}")
    private String inferenceUrl;

    @Value("${heartrate.ai.reset-gap-seconds:60}")
    private long resetGapSeconds;

    public HeartRateAiService(HeartRateAiStreamingService aiStreamingService) {
        this.aiStreamingService = aiStreamingService;

        // Separate RestTemplate instances with different timeouts
        this.backpiRestTemplate = buildRestTemplate(3_000, 3_000);
        this.inferenceRestTemplate = buildRestTemplate(5_000, 5_000);
    }

    private static RestTemplate buildRestTemplate(int connectTimeoutMs, int readTimeoutMs) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeoutMs);
        factory.setReadTimeout(readTimeoutMs);
        return new RestTemplate(factory);
    }

    /**
     * Process a raw heart-rate event for AI prediction.
     * This method is called by HeartRateAiConsumer and NEVER throws.
     */
    public void processEvent(HeartRateEvent event) {
        try {
            doProcessEvent(event);
        } catch (Exception e) {
            // Catch-all safety net — log and continue, never crash the consumer
            log.error("🤖 [AI] Unexpected error processing event for userId={}: {}",
                    event.getUserId(), e.getMessage(), e);
            try {
                broadcastError(event.getUserId(), "Unexpected AI pipeline error: " + e.getMessage());
            } catch (Exception ignored) {
                // Even broadcast failure should not propagate
            }
        }
    }

    /**
     * Get the latest AI result for a user (for REST polling).
     */
    public HeartRateAiResultDto getLatestResult(Long userId) {
        return latestResults.get(userId);
    }

    // ─── Internal logic ──────────────────────────────────────────────

    private void doProcessEvent(HeartRateEvent event) {
        if (event.getUserId() == null || event.getBpm() == null) {
            log.warn("🤖 [AI] Skipping event with null userId or bpm: {}", event.getEventId());
            return;
        }

        Long userId = event.getUserId();
        int bpm = event.getBpm();
        Instant now = Instant.now();

        // Reset AI buffer if there was a long inactivity gap
        Instant lastEventTime = lastEventTimestamps.get(userId);
        if (lastEventTime != null) {
            long gapSeconds = Duration.between(lastEventTime, now).getSeconds();

            if (gapSeconds > resetGapSeconds) {
                log.info("🤖 [AI] Resetting AI window for userId={} because gap={}s > {}s",
                        userId, gapSeconds, resetGapSeconds);

                LinkedList<Integer> existingWindow = userWindows.get(userId);
                if (existingWindow != null) {
                    synchronized (existingWindow) {
                        existingWindow.clear();
                    }
                }

                HeartRateAiResultDto waitingAfterReset = HeartRateAiResultDto.builder()
                        .userId(userId)
                        .status("WAITING")
                        .readingsCollected(0)
                        .readingsRequired(REQUIRED_READINGS)
                        .timestamp(now)
                        .build();

                latestResults.put(userId, waitingAfterReset);
                aiStreamingService.broadcast(waitingAfterReset);
            }
        }

        // Update last seen timestamp for this user
        lastEventTimestamps.put(userId, now);

        // Update sliding window
        LinkedList<Integer> window = userWindows.computeIfAbsent(userId, id -> new LinkedList<>());
        synchronized (window) {
            window.addLast(bpm);
            if (window.size() > REQUIRED_READINGS) {
                window.removeFirst();
            }
        }

        int collected;
        List<Integer> snapshot;
        synchronized (window) {
            collected = window.size();
            snapshot = new ArrayList<>(window);
        }

        if (collected < REQUIRED_READINGS) {
            // Not enough readings yet — broadcast WAITING state
            HeartRateAiResultDto waitingResult = HeartRateAiResultDto.builder()
                    .userId(userId)
                    .status("WAITING")
                    .readingsCollected(collected)
                    .readingsRequired(REQUIRED_READINGS)
                    .timestamp(now)
                    .build();

            latestResults.put(userId, waitingResult);
            aiStreamingService.broadcast(waitingResult);

            log.debug("🤖 [AI] userId={}: Waiting for readings ({}/{})",
                    userId, collected, REQUIRED_READINGS);
            return;
        }

        // >=60 readings available — fetch metadata and predict
        PatientMetadata metadata = fetchPatientMetadata(userId);

        if (metadata == null) {
            broadcastError(userId, "Patient metadata unavailable for userId=" + userId);
            return;
        }

        if (metadata.age == null || metadata.sexe == null || metadata.poids == null) {
            broadcastError(userId, "Incomplete patient metadata (missing age, sexe, or poids) for userId=" + userId);
            return;
        }

        // Call Python inference API
        callInferenceApi(userId, snapshot, metadata);
    }

    /**
     * Fetch patient metadata from backpi by userId.
     * Returns cached value if available, otherwise fetches from REST API.
     * Returns null on failure (with logging).
     */
    private PatientMetadata fetchPatientMetadata(Long userId) {
        // Check cache first
        PatientMetadata cached = metadataCache.get(userId);
        if (cached != null) {
            return cached;
        }

        try {
            String url = backpiUrl + "/" + userId;
            log.info("🤖 [AI] Fetching patient metadata from backpi: {}", url);

            ResponseEntity<Map> response = backpiRestTemplate.getForEntity(url, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();

                PatientMetadata metadata = new PatientMetadata();
                metadata.age = body.get("age") != null ? ((Number) body.get("age")).intValue() : null;
                metadata.sexe = body.get("sexe") != null ? body.get("sexe").toString() : null;
                metadata.poids = body.get("poids") != null ? ((Number) body.get("poids")).doubleValue() : null;

                metadataCache.put(userId, metadata);
                log.info("🤖 [AI] Patient metadata cached for userId={}: age={}, sexe={}, poids={}",
                        userId, metadata.age, metadata.sexe, metadata.poids);
                return metadata;
            } else {
                log.warn("🤖 [AI] backpi returned non-OK or empty response for userId={}: status={}",
                        userId, response.getStatusCode());
                return null;
            }
        } catch (Exception e) {
            log.error("🤖 [AI] Failed to fetch patient metadata from backpi for userId={}: {}",
                    userId, e.getMessage());
            return null;
        }
    }

    /**
     * Call the Python inference API with the 60-read window and patient metadata.
     * On success -> broadcast READY result.
     * On failure -> broadcast ERROR result.
     */
    @SuppressWarnings("unchecked")
    private void callInferenceApi(Long userId, List<Integer> bpmValues, PatientMetadata metadata) {
        try {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("bpm_values", bpmValues);
            requestBody.put("age", metadata.age);
            requestBody.put("poids", metadata.poids);
            requestBody.put("sexe", metadata.sexe);

            log.info("🤖 [AI] Calling inference API for userId={}, window size={}", userId, bpmValues.size());

            ResponseEntity<Map> response = inferenceRestTemplate.postForEntity(
                    inferenceUrl, requestBody, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();

                HeartRateAiResultDto result = HeartRateAiResultDto.builder()
                        .userId(userId)
                        .status("READY")
                        .readingsCollected(bpmValues.size())
                        .readingsRequired(REQUIRED_READINGS)
                        .prediction(getStringOrNull(body, "prediction"))
                        .probability(getDoubleOrNull(body, "probability"))
                        .riskLevel(getStringOrNull(body, "riskLevel"))
                        .action(getStringOrNull(body, "action"))
                        .bpmCurrent(getDoubleOrNull(body, "bpmCurrent"))
                        .bpmMean(getDoubleOrNull(body, "bpmMean"))
                        .timestamp(Instant.now())
                        .build();

                latestResults.put(userId, result);
                aiStreamingService.broadcast(result);

                log.info("🤖 [AI] Prediction for userId={}: {} (prob={}, risk={})",
                        userId, result.getPrediction(), result.getProbability(), result.getRiskLevel());
            } else {
                broadcastError(userId, "Inference API returned non-OK response: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("🤖 [AI] Failed to call inference API for userId={}: {}", userId, e.getMessage());
            broadcastError(userId, "Inference API unavailable: " + e.getMessage());
        }
    }

    /**
     * Broadcast an ERROR state for a user. Does NOT throw.
     */
    private void broadcastError(Long userId, String errorMessage) {
        try {
            int collected = 0;
            LinkedList<Integer> window = userWindows.get(userId);
            if (window != null) {
                synchronized (window) {
                    collected = window.size();
                }
            }

            HeartRateAiResultDto errorResult = HeartRateAiResultDto.builder()
                    .userId(userId)
                    .status("ERROR")
                    .readingsCollected(collected)
                    .readingsRequired(REQUIRED_READINGS)
                    .errorMessage(errorMessage)
                    .timestamp(Instant.now())
                    .build();

            latestResults.put(userId, errorResult);
            aiStreamingService.broadcast(errorResult);

            log.warn("🤖 [AI] ERROR state broadcast for userId={}: {}", userId, errorMessage);
        } catch (Exception e) {
            log.error("🤖 [AI] Failed to broadcast error for userId={}: {}", userId, e.getMessage());
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────

    private String getStringOrNull(Map<String, Object> map, String key) {
        Object val = map.get(key);
        return val != null ? val.toString() : null;
    }

    private Double getDoubleOrNull(Map<String, Object> map, String key) {
        Object val = map.get(key);
        if (val instanceof Number) {
            return ((Number) val).doubleValue();
        }
        return null;
    }

    /** Simple internal data holder for cached patient metadata */
    static class PatientMetadata {
        Integer age;
        String sexe;
        Double poids;
    }
}