package tn.esprit.smartwatchservice.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import tn.esprit.smartwatchservice.dto.HeartRateEvent;
import tn.esprit.smartwatchservice.service.HeartRateAiService;

/**
 * Internal Kafka consumer — AI Prediction Pipeline.
 *
 * Subscribes to "heartrate.raw" with its own consumer group (heartrate-ai),
 * then delegates each event to HeartRateAiService for sliding-window
 * accumulation and AI prediction.
 *
 * This consumer operates independently from the SSE, persistence,
 * and alert consumers. It NEVER throws exceptions — all failures
 * are handled internally by HeartRateAiService.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class HeartRateAiConsumer {

    private final HeartRateAiService aiService;

    @KafkaListener(
            topics = "${heartrate.topic.raw}",
            groupId = "heartrate-ai",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void onHeartRateEvent(HeartRateEvent event) {
        log.debug("🤖 [AI CONSUMER] Received eventId={}, userId={}, bpm={}",
                event.getEventId(), event.getUserId(), event.getBpm());

        // HeartRateAiService.processEvent() NEVER throws.
        // All failures are caught internally and result in ERROR state.
        aiService.processEvent(event);
    }
}
