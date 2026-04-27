package tn.esprit.smartwatchservice.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import tn.esprit.smartwatchservice.dto.HeartRateAlertEvent;

/**
 * Kafka producer that publishes heart-rate alert events
 * to the "heartrate.alerts" topic for downstream consumers (backpi).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class HeartRateAlertProducer {

    private final KafkaTemplate<String, HeartRateAlertEvent> kafkaTemplate;

    @Value("${heartrate.topic.alerts}")
    private String alertsTopic;

    /**
     * Publish a heart-rate alert event to Kafka.
     * The userId is used as the message key for partition affinity.
     */
    public void publish(HeartRateAlertEvent alert) {
        String key = String.valueOf(alert.getUserId());
        log.info("🚨 [ALERT PUBLISH] topic={}, key={}, condition={}, bpm={}, severity={}",
                alertsTopic, key, alert.getConditionType(), alert.getBpm(), alert.getSeverity());

        kafkaTemplate.send(alertsTopic, key, alert);
    }
}
