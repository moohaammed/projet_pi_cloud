package tn.esprit.smartwatchservice.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import tn.esprit.smartwatchservice.dto.HeartRateAiResultDto;
import tn.esprit.smartwatchservice.service.HeartRateAiService;
import tn.esprit.smartwatchservice.service.HeartRateAiStreamingService;

/**
 * REST + SSE controller for AI prediction results.
 *
 * Provides:
 *   - SSE stream for live AI prediction updates
 *   - REST endpoint to get the current AI state for a user
 */
@Slf4j
@RestController
@RequestMapping("/api/heart-rate/ai")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class HeartRateAiController {

    private final HeartRateAiStreamingService aiStreamingService;
    private final HeartRateAiService aiService;

    /**
     * GET /api/heart-rate/ai/stream?userId={userId}
     *
     * Opens an SSE connection for live AI prediction events.
     * Events are named "ai-prediction" and contain HeartRateAiResultDto JSON.
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@RequestParam(required = false) Long userId) {
        log.info("🤖 [AI ENDPOINT] New frontend client subscribing to AI stream (userId={})",
                userId != null ? userId : "ALL");
        return aiStreamingService.subscribe(userId);
    }

    /**
     * GET /api/heart-rate/ai/state/{userId}
     *
     * Returns the current AI prediction state for a user (for polling fallback).
     * Returns 204 No Content if no state exists yet.
     */
    @GetMapping("/state/{userId}")
    public ResponseEntity<HeartRateAiResultDto> getState(@PathVariable Long userId) {
        HeartRateAiResultDto result = aiService.getLatestResult(userId);
        if (result == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(result);
    }
}
