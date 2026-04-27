package tn.esprit.smartwatchservice.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import tn.esprit.smartwatchservice.dto.HeartRateAlertEvent;
import tn.esprit.smartwatchservice.dto.HeartRateEvent;
import tn.esprit.smartwatchservice.service.HeartRateConditionEvaluator;

import java.util.List;

/**
 * Internal Kafka consumer — Alert Detection Pipeline.
 *
 * Subscribes to "heartrate.raw" with its own consumer group,
 * evaluates heart-rate danger conditions per userId, and publishes
 * structured alert events to "heartrate.alerts" when conditions are met.
 *
 * This consumer operates independently from the SSE and persistence consumers.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class HeartRateAlertConsumer {

    private final HeartRateConditionEvaluator conditionEvaluator;
    private final HeartRateAlertProducer alertProducer;

    @KafkaListener(
            topics = "${heartrate.topic.raw}",
            groupId = "heartrate-alert",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void onHeartRateEvent(HeartRateEvent event) {
        log.debug("🚨 [ALERT CONSUMER] Received eventId={}, userId={}, bpm={}",
                event.getEventId(), event.getUserId(), event.getBpm());

        List<HeartRateAlertEvent> alerts = conditionEvaluator.evaluate(event);

        if (alerts.isEmpty()) {
            return;
        }

        for (HeartRateAlertEvent alert : alerts) {
            log.info("🚨 [ALERT CONSUMER] Condition triggered: {} for userId={}, bpm={}, severity={}",
                    alert.getConditionType(), alert.getUserId(), alert.getBpm(), alert.getSeverity());
            alertProducer.publish(alert);
        }
    }
}
