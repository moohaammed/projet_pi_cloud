package tn.esprit.smartwatchservice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.smartwatchservice.dto.HeartRateLiveStateDto;
import tn.esprit.smartwatchservice.entity.HeartRateRecord;
import tn.esprit.smartwatchservice.service.HeartRateQueryService;

import java.util.Arrays;
import java.util.List;

/**
 * REST controller for querying heart-rate data from MongoDB.
 * All endpoints are read-only (plus delete).
 *
 * The old POST endpoint has been removed — ingestion now goes
 * through {@link HeartRateIngestionController}.
 */
@RestController
@RequestMapping("/api/heart-rate")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class HeartRateController {

    private final HeartRateQueryService queryService;

    /**
     * GET /api/heart-rate/latest/{userId}
     * Return the most recent heart-rate reading for a user.
     * Returns 204 No Content if no data exists.
     */
    @GetMapping("/latest/{userId}")
    public ResponseEntity<HeartRateRecord> getLatest(@PathVariable Long userId) {
        return queryService.getLatest(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    /**
     * GET /api/heart-rate/history/{userId}
     * Return the full heart-rate history for a user.
     * Returns 204 No Content if no data exists.
     */
    @GetMapping("/history/{userId}")
    public ResponseEntity<List<HeartRateRecord>> getHistory(@PathVariable Long userId) {
        List<HeartRateRecord> records = queryService.getHistory(userId);
        if (records.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(records);
    }

    @GetMapping("/state/{userId}")
    public ResponseEntity<HeartRateLiveStateDto> getState(@PathVariable Long userId) {
        return ResponseEntity.ok(queryService.getState(userId));
    }

    @GetMapping("/states")
    public ResponseEntity<List<HeartRateLiveStateDto>> getStates(@RequestParam String userIds) {
        return ResponseEntity.ok(queryService.getStates(parseUserIds(userIds)));
    }

    /**
     * GET /api/heart-rate/{id}
     * Return a specific heart-rate record by its MongoDB ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<HeartRateRecord> getById(@PathVariable String id) {
        return queryService.getById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * DELETE /api/heart-rate/{id}
     * Delete a specific heart-rate record by its MongoDB ID.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        queryService.delete(id);
        return ResponseEntity.noContent().build();
    }

    private List<Long> parseUserIds(String userIds) {
        if (userIds == null || userIds.isBlank()) {
            return List.of();
        }
        return Arrays.stream(userIds.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(Long::valueOf)
                .toList();
    }
}
