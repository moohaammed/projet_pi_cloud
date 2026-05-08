package tn.esprit.smartwatchservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tn.esprit.smartwatchservice.dto.HeartRateEvent;
import tn.esprit.smartwatchservice.dto.HeartRateIngestRequest;
import tn.esprit.smartwatchservice.kafka.HeartRateProducer;

import java.time.Instant;
import java.util.UUID;

/**
 * Orchestrates the ingestion flow:
 * validates, normalizes, and publishes heart-rate events to Kafka.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class HeartRateIngestionService {

    private final HeartRateProducer heartRateProducer;

    /**
     * Accept an incoming heart-rate reading, enrich it with server metadata,
     * and publish it to Kafka for async processing.
     *
     * @return the eventId assigned to this reading
     */
    public String ingest(HeartRateIngestRequest request) {
        String eventId = (request.getEventId() != null && !request.getEventId().isBlank())
                ? request.getEventId()
                : UUID.randomUUID().toString();
        Instant receivedAt = Instant.now();

        Instant capturedAt = null;
        if (request.getCapturedAt() != null && !request.getCapturedAt().isBlank()) {
            try {
                capturedAt = Instant.parse(request.getCapturedAt());
            } catch (Exception e) {
                log.warn("[INGESTION] Could not parse capturedAt='{}', ignoring. eventId={}",
                        request.getCapturedAt(), eventId);
            }
        }

        String source = (request.getSource() != null && !request.getSource().isBlank())
                ? request.getSource()
                : "UNKNOWN";

        HeartRateEvent event = HeartRateEvent.builder()
                .eventId(eventId)
                .userId(request.getUserId())
                .deviceName(request.getDeviceName())
                .bpm(request.getBpm())
                .source(source)
                .capturedAt(capturedAt)
                .receivedAt(receivedAt)
                .build();

        log.info("[INGESTION] Accepted eventId={}, userId={}, bpm={}, source={}",
                eventId, request.getUserId(), request.getBpm(), source);

        heartRateProducer.publish(event);

        return eventId;
    }
}
