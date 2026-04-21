package esprit.tn.backpi.helpnotification.kafka;

import esprit.tn.backpi.helpnotification.dto.HeartRateAlertEvent;
import esprit.tn.backpi.helpnotification.service.AlertConfirmationService;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Kafka consumer that receives heart-rate alert events from the
 * "heartrate.alerts" topic and routes them through the 10-second
 * confirmation service before triggering notifications.
 *
 * This is the bridge between smartwatch-service's condition detection
 * and backpi's notification delivery (WebSocket + email).
 *
 * VERSION 1.1 change: alerts are now routed through AlertConfirmationService
 * for a 10-second confirmation delay before notification is sent.
 */
@Component
public class HeartRateHelpNotificationConsumer {

    private final AlertConfirmationService alertConfirmationService;

    public HeartRateHelpNotificationConsumer(AlertConfirmationService alertConfirmationService) {
        this.alertConfirmationService = alertConfirmationService;
    }

    @KafkaListener(
            topics = "${heartrate.topic.alerts}",
            groupId = "backpi-help-notification",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void onHeartRateAlert(HeartRateAlertEvent alert) {
        System.out.println("🚨 [HEART-RATE ALERT CONSUMER] Received alert: condition="
                + alert.getConditionType() + ", userId=" + alert.getUserId()
                + ", bpm=" + alert.getBpm() + ", severity=" + alert.getSeverity());

        try {
            // Route through 10-second confirmation before notification
            alertConfirmationService.submitForConfirmation(alert);

            System.out.println("🚨 [HEART-RATE ALERT CONSUMER] Alert submitted for confirmation: userId="
                    + alert.getUserId() + ", condition=" + alert.getConditionType());
        } catch (Exception e) {
            System.err.println("🚨 [HEART-RATE ALERT CONSUMER] Failed to submit alert for userId="
                    + alert.getUserId() + ": " + e.getMessage());
        }
    }
}
