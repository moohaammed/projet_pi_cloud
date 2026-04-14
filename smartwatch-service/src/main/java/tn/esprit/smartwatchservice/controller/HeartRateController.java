package tn.esprit.smartwatchservice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.smartwatchservice.dto.HeartRateRequest;
import tn.esprit.smartwatchservice.entity.HeartRateRecord;
import tn.esprit.smartwatchservice.service.HeartRateService;

import java.util.List;

@RestController
@RequestMapping("/api/heart-rate")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class HeartRateController {

    private final HeartRateService heartRateService;

    /**
     * POST /api/heart-rate
     * Save a new heart-rate measurement from a smartwatch.
     * The recordedAt timestamp is generated automatically by the server.
     */
    @PostMapping
    public ResponseEntity<HeartRateRecord> create(@RequestBody HeartRateRequest request) {
        HeartRateRecord saved = heartRateService.save(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /**
     * GET /api/heart-rate/latest/{userId}
     * Return the most recent heart-rate reading for a user.
     * Returns 204 No Content if no data exists.
     */
    @GetMapping("/latest/{userId}")
    public ResponseEntity<HeartRateRecord> getLatest(@PathVariable Long userId) {
        return heartRateService.getLatest(userId)
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
        List<HeartRateRecord> records = heartRateService.getHistory(userId);
        if (records.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(records);
    }

    /**
     * GET /api/heart-rate/{id}
     * Return a specific heart-rate record by its MongoDB ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<HeartRateRecord> getById(@PathVariable String id) {
        return heartRateService.getById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * DELETE /api/heart-rate/{id}
     * Delete a specific heart-rate record by its MongoDB ID.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        heartRateService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
