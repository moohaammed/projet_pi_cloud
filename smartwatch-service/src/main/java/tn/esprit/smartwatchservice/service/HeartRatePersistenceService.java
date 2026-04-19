package tn.esprit.smartwatchservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tn.esprit.smartwatchservice.dto.HeartRateEvent;
import tn.esprit.smartwatchservice.entity.HeartRateRecord;
import tn.esprit.smartwatchservice.repository.HeartRateRepository;

import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * Persists heart-rate events to MongoDB.
 * Called by the persistence Kafka consumer.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class HeartRatePersistenceService {

    private final HeartRateRepository heartRateRepository;

    /**
     * Convert a Kafka event to a MongoDB entity and save it.
     */
    public HeartRateRecord persist(HeartRateEvent event) {
        HeartRateRecord record = HeartRateRecord.builder()
                .eventId(event.getEventId())
                .userId(event.getUserId())
                .deviceName(event.getDeviceName())
                .bpm(event.getBpm())
                .source(event.getSource())
                .capturedAt(event.getCapturedAt())
                .receivedAt(event.getReceivedAt())
                // Backward compatibility: populate legacy recordedAt field
                .recordedAt(LocalDateTime.ofInstant(
                        event.getReceivedAt(),
                        ZoneId.systemDefault()))
                .build();

        HeartRateRecord saved = heartRateRepository.save(record);
        log.info("💾 [PERSISTENCE] Saved record id={}, eventId={}", saved.getId(), saved.getEventId());
        return saved;
    }
}
