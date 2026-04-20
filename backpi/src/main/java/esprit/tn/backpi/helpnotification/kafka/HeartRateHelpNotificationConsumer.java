package esprit.tn.backpi.helpnotification.kafka;

import esprit.tn.backpi.helpnotification.dto.HeartRateAlertEvent;
import esprit.tn.backpi.helpnotification.service.HelpNotificationService;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Kafka consumer that receives heart-rate alert events from the
 * "heartrate.alerts" topic and triggers the existing help notification
 * workflow automatically.
 *
 * This is the bridge between smartwatch-service's condition detection
 * and backpi's notification delivery (WebSocket + email).
 */
@Component
public class HeartRateHelpNotificationConsumer {

    private final HelpNotificationService helpNotificationService;

    public HeartRateHelpNotificationConsumer(HelpNotificationService helpNotificationService) {
        this.helpNotificationService = helpNotificationService;
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
            helpNotificationService.sendHelpNotification(
                    alert.getUserId(),
                    alert.getMessage(),
                    "HEART_RATE_ALERT",
                    alert.getConditionType()
            );

            System.out.println("🚨 [HEART-RATE ALERT CONSUMER] Help notification triggered successfully for userId="
                    + alert.getUserId() + ", condition=" + alert.getConditionType());
        } catch (Exception e) {
            System.err.println("🚨 [HEART-RATE ALERT CONSUMER] Failed to send help notification for userId="
                    + alert.getUserId() + ": " + e.getMessage());
        }
    }
}
