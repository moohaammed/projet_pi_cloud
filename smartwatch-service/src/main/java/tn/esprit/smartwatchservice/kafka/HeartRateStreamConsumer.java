package tn.esprit.smartwatchservice.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import tn.esprit.smartwatchservice.dto.HeartRateEvent;
import tn.esprit.smartwatchservice.dto.HeartRateViewDto;
import tn.esprit.smartwatchservice.service.HeartRateStreamingService;

/**
 * Internal Kafka consumer — Display / SSE Pipeline.
 *
 * Subscribes to "heartrate.raw" with its own consumer group,
 * then pushes each event to all connected SSE clients in real time.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class HeartRateStreamConsumer {

    private final HeartRateStreamingService streamingService;

    @KafkaListener(
            topics = "${heartrate.topic.raw}",
            groupId = "heartrate-stream",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void onHeartRateEvent(HeartRateEvent event) {
        log.info("📡 [STREAM CONSUMER] Received eventId={}, userId={}, bpm={}",
                event.getEventId(), event.getUserId(), event.getBpm());

        HeartRateViewDto viewDto = HeartRateViewDto.builder()
                .eventId(event.getEventId())
                .userId(event.getUserId())
                .deviceName(event.getDeviceName())
                .bpm(event.getBpm())
                .source(event.getSource())
                .capturedAt(event.getCapturedAt())
                .receivedAt(event.getReceivedAt())
                .build();

        streamingService.broadcast(viewDto);

        log.info("📡 [STREAM CONSUMER] Pushed to SSE — eventId={}", event.getEventId());
    }
}
