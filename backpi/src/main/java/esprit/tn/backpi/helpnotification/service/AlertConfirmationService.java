package esprit.tn.backpi.helpnotification.service;

import esprit.tn.backpi.helpnotification.dto.HeartRateAlertEvent;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.concurrent.*;

/**
 * Implements a 10-second confirmation delay for automatic heart-rate alerts.
 *
 * When a danger condition is first detected, the alert is held in a pending
 * queue instead of triggering an immediate notification. After the configured
 * delay (default 10 seconds), the service checks whether the alert should
 * still be sent:
 *
 * <ul>
 *   <li>If the <em>same</em> condition was received again during the window
 *       → the alert is <strong>confirmed</strong> (re-validated)</li>
 *   <li>If a normal reading was received for that patient (cancellation)
 *       → the alert is <strong>discarded</strong></li>
 *   <li>If neither happened (single alert, no contradiction)
 *       → the alert is still <strong>sent</strong>, because the upstream
 *       smartwatch-service already applies its own sustained-window logic</li>
 * </ul>
 *
 * This reduces false positives from transient noisy sensor readings.
 *
 * <p><strong>Important:</strong> This service only applies to automatic
 * heart-rate alerts. The manual help-notification button is unaffected.</p>
 */
@Service
public class AlertConfirmationService {

    private final HelpNotificationService helpNotificationService;

    @Value("${helpnotification.alert.confirmation-delay-seconds:10}")
    private long confirmationDelaySeconds;

    /**
     * Pending alerts keyed by "userId:conditionType".
     * Stores the latest alert for each patient+condition combination.
     */
    private final ConcurrentHashMap<String, PendingAlert> pendingAlerts = new ConcurrentHashMap<>();

    /**
     * Tracks whether a cancellation (normal BPM) was received for a patient
     * during the confirmation window. Key is the composite key "userId:conditionType".
     */
    private final ConcurrentHashMap<String, Boolean> cancellations = new ConcurrentHashMap<>();

    /** Single-threaded scheduler for delayed confirmation checks. */
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "alert-confirmation-scheduler");
        t.setDaemon(true);
        return t;
    });

    public AlertConfirmationService(HelpNotificationService helpNotificationService) {
        this.helpNotificationService = helpNotificationService;
    }

    /**
     * Submit an incoming heart-rate alert for confirmation.
     *
     * If no pending alert exists for this patient+condition, the alert is
     * stored and a delayed task is scheduled. If a pending alert already
     * exists (same patient+condition within the confirmation window),
     * the entry is refreshed — this counts as re-confirmation.
     *
     * @param alert the alert event from Kafka
     */
    public void submitForConfirmation(HeartRateAlertEvent alert) {
        String key = buildKey(alert.getUserId(), alert.getConditionType());

        PendingAlert existing = pendingAlerts.get(key);

        if (existing != null) {
            // Re-confirmation: same condition triggered again during the window
            existing.confirmationCount.incrementAndGet();
            existing.latestAlert = alert;
            System.out.println("🔄 [ALERT-CONFIRM] Re-confirmed alert: " + key
                    + " (count=" + existing.confirmationCount.get() + ")");
            return;
        }

        // First occurrence — store and schedule delayed check
        PendingAlert pending = new PendingAlert(alert);
        pendingAlerts.put(key, pending);
        cancellations.remove(key); // clear any stale cancellation

        System.out.println("⏳ [ALERT-CONFIRM] Alert pending confirmation (" + confirmationDelaySeconds
                + "s): " + key + ", bpm=" + alert.getBpm() + ", condition=" + alert.getConditionType());

        scheduler.schedule(() -> processConfirmation(key), confirmationDelaySeconds, TimeUnit.SECONDS);
    }

    /**
     * Called by external code to signal that a patient's BPM has returned
     * to normal, cancelling any pending alert for the given condition.
     *
     * Note: In the current architecture, this can be extended if needed.
     * For now, cancellation happens implicitly — if the smartwatch-service
     * stops sending alerts for a condition, it means the condition resolved.
     */
    public void cancelPendingAlert(Long userId, String conditionType) {
        String key = buildKey(userId, conditionType);
        cancellations.put(key, Boolean.TRUE);
        System.out.println("❌ [ALERT-CONFIRM] Cancellation received for: " + key);
    }

    /**
     * Process a pending alert after the confirmation delay has elapsed.
     */
    private void processConfirmation(String key) {
        PendingAlert pending = pendingAlerts.remove(key);
        if (pending == null) {
            System.out.println("⏭️ [ALERT-CONFIRM] No pending alert found for: " + key + " (already processed)");
            return;
        }

        // Check if a cancellation was received during the window
        Boolean cancelled = cancellations.remove(key);
        if (Boolean.TRUE.equals(cancelled)) {
            System.out.println("🚫 [ALERT-CONFIRM] Alert cancelled (normal BPM received): " + key);
            return;
        }

        // Alert confirmed — proceed with notification
        HeartRateAlertEvent alert = pending.latestAlert;
        System.out.println("✅ [ALERT-CONFIRM] Alert confirmed after " + confirmationDelaySeconds
                + "s: " + key + " (confirmations=" + pending.confirmationCount.get()
                + "), proceeding to notification");

        try {
            helpNotificationService.sendAutomaticHelpNotification(
                    alert.getUserId(),
                    alert.getMessage(),
                    alert.getConditionType(),
                    alert.getBpm(),
                    alert.getDetectedAt()
            );
        } catch (Exception e) {
            System.err.println("❌ [ALERT-CONFIRM] Failed to send notification for " + key
                    + ": " + e.getMessage());
        }
    }

    private String buildKey(Long userId, String conditionType) {
        return userId + ":" + conditionType;
    }

    @PreDestroy
    public void shutdown() {
        scheduler.shutdownNow();
    }

    // ─── Internal data structure ──────────────────────────────────────

    /**
     * Holds a pending alert and its confirmation metadata.
     */
    private static class PendingAlert {
        volatile HeartRateAlertEvent latestAlert;
        final java.util.concurrent.atomic.AtomicInteger confirmationCount;
        final Instant firstReceivedAt;

        PendingAlert(HeartRateAlertEvent alert) {
            this.latestAlert = alert;
            this.confirmationCount = new java.util.concurrent.atomic.AtomicInteger(1);
            this.firstReceivedAt = Instant.now();
        }
    }
}
