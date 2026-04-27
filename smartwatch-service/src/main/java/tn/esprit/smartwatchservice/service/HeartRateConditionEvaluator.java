package tn.esprit.smartwatchservice.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tn.esprit.smartwatchservice.dto.HeartRateAlertEvent;
import tn.esprit.smartwatchservice.dto.HeartRateEvent;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Evaluates incoming heart-rate events against 5 danger conditions per userId.
 *
 * Maintains a per-user in-memory sliding window of recent BPM readings
 * and a per-user + per-condition cooldown to prevent notification spam.
 *
 * Conditions:
 *   1. TACHYCARDIE        — bpm > 120 sustained for 15 seconds
 *   2. BRADYCARDIE        — bpm < 50 sustained for 15 seconds
 *   3. VARIATION_ANORMALE — abs(bpm_now - bpm_5s_ago) > 30
 *   4. DONNEE_INCOHERENTE — bpm == 0 or bpm > 220 (immediate)
 *   5. PIC_SOUDAIN        — max-min spread > 40 within 3 seconds
 */
@Slf4j
@Service
public class HeartRateConditionEvaluator {

    /** Cooldown duration in seconds — configurable via application.properties */
    @Value("${heartrate.alert.cooldown-seconds:60}")
    private long cooldownSeconds;

    /** Per-user state map */
    private final ConcurrentHashMap<Long, UserHeartRateState> userStates = new ConcurrentHashMap<>();

    // ─── Condition thresholds ──────────────────────────────────────────

    private static final int TACHYCARDIE_BPM       = 120;
    private static final int BRADYCARDIE_BPM       = 50;
    private static final long SUSTAINED_WINDOW_SEC  = 15;
    private static final int VARIATION_THRESHOLD    = 30;
    private static final long VARIATION_WINDOW_SEC  = 5;
    private static final int SPIKE_THRESHOLD        = 40;
    private static final long SPIKE_WINDOW_SEC      = 3;
    private static final int INCOHERENT_MIN         = 0;
    private static final int INCOHERENT_MAX         = 220;

    // ─── Condition type constants ──────────────────────────────────────

    public static final String TACHYCARDIE        = "TACHYCARDIE";
    public static final String BRADYCARDIE        = "BRADYCARDIE";
    public static final String VARIATION_ANORMALE = "VARIATION_ANORMALE";
    public static final String DONNEE_INCOHERENTE = "DONNEE_INCOHERENTE";
    public static final String PIC_SOUDAIN        = "PIC_SOUDAIN";

    /**
     * Evaluate all conditions for the given heart-rate event.
     *
     * @return list of alert events that should be published (empty if nothing triggered)
     */
    public List<HeartRateAlertEvent> evaluate(HeartRateEvent event) {
        if (event.getUserId() == null || event.getBpm() == null) {
            log.warn("🚨 [CONDITION] Skipping event with null userId or bpm: {}", event.getEventId());
            return Collections.emptyList();
        }

        Long userId = event.getUserId();
        int bpm = event.getBpm();
        Instant now = event.getReceivedAt() != null ? event.getReceivedAt() : Instant.now();

        // Get or create per-user state
        UserHeartRateState state = userStates.computeIfAbsent(userId, id -> new UserHeartRateState());

        // Record the new reading
        state.addReading(now, bpm);

        // Evaluate all conditions
        List<HeartRateAlertEvent> alerts = new ArrayList<>();

        checkDonneeIncoherente(state, event, bpm, now, alerts);
        checkTachycardie(state, event, bpm, now, alerts);
        checkBradycardie(state, event, bpm, now, alerts);
        checkVariationAnormale(state, event, bpm, now, alerts);
        checkPicSoudain(state, event, bpm, now, alerts);

        return alerts;
    }

    // ─── Condition checks ──────────────────────────────────────────────

    /**
     * DONNEE_INCOHERENTE — bpm == 0 or bpm > 220 → immediate alert
     */
    private void checkDonneeIncoherente(UserHeartRateState state, HeartRateEvent event,
                                         int bpm, Instant now, List<HeartRateAlertEvent> alerts) {
        if (bpm <= INCOHERENT_MIN || bpm > INCOHERENT_MAX) {
            if (state.isCooldownExpired(DONNEE_INCOHERENTE, now, cooldownSeconds)) {
                state.setCooldown(DONNEE_INCOHERENTE, now);
                alerts.add(buildAlert(event, now, DONNEE_INCOHERENTE, "CRITICAL",
                        "Donnée incohérente détectée — BPM=" + bpm + " (valeur impossible)"));
                log.warn("🚨 [CONDITION] DONNEE_INCOHERENTE for userId={}, bpm={}", event.getUserId(), bpm);
            }
        }
    }

    /**
     * TACHYCARDIE — all readings > 120 for 15 consecutive seconds
     */
    private void checkTachycardie(UserHeartRateState state, HeartRateEvent event,
                                   int bpm, Instant now, List<HeartRateAlertEvent> alerts) {
        List<BpmReading> window = state.getReadingsInWindow(now, SUSTAINED_WINDOW_SEC);
        if (window.size() < 2) return; // need at least 2 readings in the window

        // Check that the window actually spans ~15 seconds
        Instant earliest = window.get(0).timestamp;
        long spanSeconds = now.getEpochSecond() - earliest.getEpochSecond();
        if (spanSeconds < SUSTAINED_WINDOW_SEC) return;

        boolean allAbove = window.stream().allMatch(r -> r.bpm > TACHYCARDIE_BPM);
        if (allAbove) {
            if (state.isCooldownExpired(TACHYCARDIE, now, cooldownSeconds)) {
                state.setCooldown(TACHYCARDIE, now);
                alerts.add(buildAlert(event, now, TACHYCARDIE, "WARNING",
                        "Tachycardie détectée — BPM>" + TACHYCARDIE_BPM + " pendant " + SUSTAINED_WINDOW_SEC + "s"));
                log.warn("🚨 [CONDITION] TACHYCARDIE for userId={}, sustained {}s", event.getUserId(), spanSeconds);
            }
        }
    }

    /**
     * BRADYCARDIE — all readings < 50 for 15 consecutive seconds
     */
    private void checkBradycardie(UserHeartRateState state, HeartRateEvent event,
                                   int bpm, Instant now, List<HeartRateAlertEvent> alerts) {
        List<BpmReading> window = state.getReadingsInWindow(now, SUSTAINED_WINDOW_SEC);
        if (window.size() < 2) return;

        Instant earliest = window.get(0).timestamp;
        long spanSeconds = now.getEpochSecond() - earliest.getEpochSecond();
        if (spanSeconds < SUSTAINED_WINDOW_SEC) return;

        boolean allBelow = window.stream().allMatch(r -> r.bpm < BRADYCARDIE_BPM);
        if (allBelow) {
            if (state.isCooldownExpired(BRADYCARDIE, now, cooldownSeconds)) {
                state.setCooldown(BRADYCARDIE, now);
                alerts.add(buildAlert(event, now, BRADYCARDIE, "WARNING",
                        "Bradycardie détectée — BPM<" + BRADYCARDIE_BPM + " pendant " + SUSTAINED_WINDOW_SEC + "s"));
                log.warn("🚨 [CONDITION] BRADYCARDIE for userId={}, sustained {}s", event.getUserId(), spanSeconds);
            }
        }
    }

    /**
     * VARIATION_ANORMALE — abs(bpm_now - bpm_~5s_ago) > 30
     */
    private void checkVariationAnormale(UserHeartRateState state, HeartRateEvent event,
                                         int bpm, Instant now, List<HeartRateAlertEvent> alerts) {
        Optional<BpmReading> readingAgo = state.getReadingClosestTo(now, VARIATION_WINDOW_SEC);
        if (readingAgo.isEmpty()) return;

        int diff = Math.abs(bpm - readingAgo.get().bpm);
        if (diff > VARIATION_THRESHOLD) {
            if (state.isCooldownExpired(VARIATION_ANORMALE, now, cooldownSeconds)) {
                state.setCooldown(VARIATION_ANORMALE, now);
                alerts.add(buildAlert(event, now, VARIATION_ANORMALE, "WARNING",
                        "Variation anormale détectée — Δ" + diff + " BPM en " + VARIATION_WINDOW_SEC + "s"));
                log.warn("🚨 [CONDITION] VARIATION_ANORMALE for userId={}, diff={}", event.getUserId(), diff);
            }
        }
    }

    /**
     * PIC_SOUDAIN — max-min BPM spread > 40 within 3 seconds
     */
    private void checkPicSoudain(UserHeartRateState state, HeartRateEvent event,
                                  int bpm, Instant now, List<HeartRateAlertEvent> alerts) {
        List<BpmReading> window = state.getReadingsInWindow(now, SPIKE_WINDOW_SEC);
        if (window.size() < 2) return;

        int maxBpm = window.stream().mapToInt(r -> r.bpm).max().orElse(0);
        int minBpm = window.stream().mapToInt(r -> r.bpm).min().orElse(0);
        int spread = maxBpm - minBpm;

        if (spread > SPIKE_THRESHOLD) {
            if (state.isCooldownExpired(PIC_SOUDAIN, now, cooldownSeconds)) {
                state.setCooldown(PIC_SOUDAIN, now);
                alerts.add(buildAlert(event, now, PIC_SOUDAIN, "CRITICAL",
                        "Pic soudain détecté — Δ" + spread + " BPM en " + SPIKE_WINDOW_SEC + "s"));
                log.warn("🚨 [CONDITION] PIC_SOUDAIN for userId={}, spread={}", event.getUserId(), spread);
            }
        }
    }

    // ─── Helpers ───────────────────────────────────────────────────────

    private HeartRateAlertEvent buildAlert(HeartRateEvent source, Instant now,
                                            String conditionType, String severity, String message) {
        return HeartRateAlertEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .userId(source.getUserId())
                .deviceName(source.getDeviceName())
                .bpm(source.getBpm())
                .conditionType(conditionType)
                .message(message)
                .severity(severity)
                .capturedAt(source.getCapturedAt())
                .detectedAt(now)
                .build();
    }

    // ─── Internal data structures ──────────────────────────────────────

    /** Single BPM reading with timestamp */
    static class BpmReading {
        final Instant timestamp;
        final int bpm;

        BpmReading(Instant timestamp, int bpm) {
            this.timestamp = timestamp;
            this.bpm = bpm;
        }
    }

    /**
     * Per-user state: circular buffer of recent readings + cooldown map.
     * Keeps up to ~30 seconds of readings and prunes older entries.
     */
    static class UserHeartRateState {

        private static final long MAX_BUFFER_AGE_SEC = 30;

        private final LinkedList<BpmReading> readings = new LinkedList<>();
        private final Map<String, Instant> cooldowns = new HashMap<>();

        synchronized void addReading(Instant timestamp, int bpm) {
            readings.addLast(new BpmReading(timestamp, bpm));
            prune(timestamp);
        }

        /**
         * Get all readings within [now - windowSec, now].
         */
        synchronized List<BpmReading> getReadingsInWindow(Instant now, long windowSec) {
            Instant cutoff = now.minusSeconds(windowSec);
            List<BpmReading> result = new ArrayList<>();
            for (BpmReading r : readings) {
                if (!r.timestamp.isBefore(cutoff)) {
                    result.add(r);
                }
            }
            return result;
        }

        /**
         * Find the reading closest to (now - targetAgeSec).
         * Returns empty if no reading exists older than 3 seconds ago.
         */
        synchronized Optional<BpmReading> getReadingClosestTo(Instant now, long targetAgeSec) {
            Instant target = now.minusSeconds(targetAgeSec);
            BpmReading closest = null;
            long closestDiff = Long.MAX_VALUE;

            for (BpmReading r : readings) {
                // Only consider readings that are at least 3 seconds old
                if (r.timestamp.isAfter(now.minusSeconds(3))) continue;

                long diff = Math.abs(r.timestamp.getEpochSecond() - target.getEpochSecond());
                if (diff < closestDiff) {
                    closestDiff = diff;
                    closest = r;
                }
            }

            // Accept if within 2 second tolerance of the target age
            if (closest != null && closestDiff <= 2) {
                return Optional.of(closest);
            }
            return Optional.empty();
        }

        synchronized boolean isCooldownExpired(String conditionType, Instant now, long cooldownSec) {
            Instant lastTriggered = cooldowns.get(conditionType);
            if (lastTriggered == null) return true;
            return now.getEpochSecond() - lastTriggered.getEpochSecond() >= cooldownSec;
        }

        synchronized void setCooldown(String conditionType, Instant now) {
            cooldowns.put(conditionType, now);
        }

        /** Remove readings older than MAX_BUFFER_AGE_SEC */
        private void prune(Instant now) {
            Instant cutoff = now.minusSeconds(MAX_BUFFER_AGE_SEC);
            while (!readings.isEmpty() && readings.peekFirst().timestamp.isBefore(cutoff)) {
                readings.pollFirst();
            }
        }
    }
}
