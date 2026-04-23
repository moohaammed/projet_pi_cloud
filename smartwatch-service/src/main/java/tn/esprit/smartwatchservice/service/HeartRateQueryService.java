package tn.esprit.smartwatchservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
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
}
