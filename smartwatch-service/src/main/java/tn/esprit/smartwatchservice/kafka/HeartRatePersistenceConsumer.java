package tn.esprit.smartwatchservice.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import tn.esprit.smartwatchservice.dto.HeartRateEvent;
import tn.esprit.smartwatchservice.service.HeartRatePersistenceService;

/**
 * Internal Kafka consumer — Persistence Pipeline.
 *
 * Subscribes to "heartrate.raw" with its own consumer group,
 * ensuring every heart-rate event is persisted to MongoDB
 * independently of other consumers.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class HeartRatePersistenceConsumer {

    private final HeartRatePersistenceService persistenceService;

    @KafkaListener(
            topics = "${heartrate.topic.raw}",
            groupId = "heartrate-persistence",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void onHeartRateEvent(HeartRateEvent event) {
        log.info("💾 [PERSISTENCE CONSUMER] Received eventId={}, userId={}, bpm={}",
                event.getEventId(), event.getUserId(), event.getBpm());

        persistenceService.persist(event);

        log.info("💾 [PERSISTENCE CONSUMER] Saved to MongoDB — eventId={}", event.getEventId());
    }
}
