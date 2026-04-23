package tn.esprit.smartwatchservice.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import tn.esprit.smartwatchservice.dto.HeartRateEvent;

/**
 * Kafka producer that publishes validated heart-rate events
 * to the "heartrate.raw" topic for internal consumers.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class HeartRateProducer {

    private final KafkaTemplate<String, HeartRateEvent> kafkaTemplate;

    @Value("${heartrate.topic.raw}")
    private String rawTopic;

    /**
     * Publish a heart-rate event to Kafka.
     * The userId is used as the message key for partition affinity.
     */
    public void publish(HeartRateEvent event) {
        String key = String.valueOf(event.getUserId());
        log.info("📤 [KAFKA PUBLISH] topic={}, key={}, eventId={}, bpm={}",
                rawTopic, key, event.getEventId(), event.getBpm());

        kafkaTemplate.send(rawTopic, key, event);
    }
}
