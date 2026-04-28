package tn.esprit.smartwatchservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.esprit.smartwatchservice.dto.HeartRateLiveStateDto;
import tn.esprit.smartwatchservice.dto.HeartRateViewDto;
import tn.esprit.smartwatchservice.entity.HeartRateRecord;
import tn.esprit.smartwatchservice.repository.HeartRateRepository;

import java.util.List;
import java.util.Optional;

/**
 * Query service for heart-rate data from MongoDB.
 * Used by the query controller for latest/history/getById/delete operations.
 */
@Service
@RequiredArgsConstructor
public class HeartRateQueryService {

    private final HeartRateRepository heartRateRepository;
    private final HeartRateStreamingService streamingService;

    /**
     * Get the most recent heart-rate record for a user.
     */
    public Optional<HeartRateRecord> getLatest(Long userId) {
        return heartRateRepository.findTopByUserIdOrderByRecordedAtDesc(userId);
    }

    /**
     * Get the full heart-rate history for a user (most recent first).
     */
    public List<HeartRateRecord> getHistory(Long userId) {
        return heartRateRepository.findByUserIdOrderByRecordedAtDesc(userId);
    }

    public HeartRateLiveStateDto getState(Long userId) {
        return streamingService.getLatestLiveEvent(userId)
                .map(event -> toLiveState(event, true))
                .orElseGet(() -> heartRateRepository.findTopByUserIdOrderByRecordedAtDesc(userId)
                        .map(record -> toLiveState(record, false))
                        .orElseGet(() -> disconnectedState(userId)));
    }

    public List<HeartRateLiveStateDto> getStates(List<Long> userIds) {
        return userIds.stream()
                .distinct()
                .map(this::getState)
                .toList();
    }

    /**
     * Get a specific record by its MongoDB ID.
     */
    public Optional<HeartRateRecord> getById(String id) {
        return heartRateRepository.findById(id);
    }

    /**
     * Delete a specific record by its MongoDB ID.
     */
    public void delete(String id) {
        heartRateRepository.deleteById(id);
    }

    private HeartRateLiveStateDto toLiveState(HeartRateViewDto event, boolean connected) {
        return HeartRateLiveStateDto.builder()
                .eventId(event.getEventId())
                .userId(event.getUserId())
                .deviceName(event.getDeviceName())
                .bpm(event.getBpm())
                .source(event.getSource())
                .capturedAt(event.getCapturedAt())
                .receivedAt(event.getReceivedAt())
                .lastReceivedAt(event.getReceivedAt())
                .connected(connected)
                .zone(resolveZone(event.getBpm()))
                .build();
    }

    private HeartRateLiveStateDto toLiveState(HeartRateRecord record, boolean connected) {
        return HeartRateLiveStateDto.builder()
                .eventId(record.getEventId())
                .userId(record.getUserId())
                .deviceName(record.getDeviceName())
                .bpm(record.getBpm())
                .source(record.getSource())
                .capturedAt(record.getCapturedAt())
                .receivedAt(record.getReceivedAt())
                .lastReceivedAt(record.getReceivedAt())
                .connected(connected)
                .zone(connected ? resolveZone(record.getBpm()) : "DISCONNECTED")
                .build();
    }

    private HeartRateLiveStateDto disconnectedState(Long userId) {
        return HeartRateLiveStateDto.builder()
                .userId(userId)
                .connected(false)
                .zone("DISCONNECTED")
                .build();
    }

    private String resolveZone(Integer bpm) {
        if (bpm == null) {
            return "DISCONNECTED";
        }
        if (bpm < 60) {
            return "BRADYCARDIA";
        }
        if (bpm <= 100) {
            return "NORMAL";
        }
        return "TACHYCARDIA";
    }
}
