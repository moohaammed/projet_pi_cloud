package tn.esprit.smartwatchservice.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import tn.esprit.smartwatchservice.service.HeartRateStreamingService;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * SSE endpoint for live heart-rate streaming to the Angular frontend.
 *
 * Clients connect via GET /api/heart-rate/stream and receive
 * real-time heart-rate events as they flow through Kafka.
 */
@Slf4j
@RestController
@RequestMapping("/api/heart-rate")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class HeartRateStreamController {

    private final HeartRateStreamingService streamingService;

    /**
     * GET /api/heart-rate/stream?userId={userId}
     *
     * Opens an SSE connection. The client will receive "heartrate" events
     * in real time as the BLE collector sends new readings.
     *
     * @param userId optional — if provided, only events for this user are streamed.
     *               If omitted, the client receives events for ALL users.
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String userIds) {
        Set<Long> parsedUserIds = parseUserIds(userIds);
        log.info("📡 [SSE ENDPOINT] New frontend client subscribing to live stream (userId={}, userIds={})",
                userId != null ? userId : "ALL",
                parsedUserIds != null ? parsedUserIds : "ALL");
        return streamingService.subscribe(userId, parsedUserIds);
    }

    private Set<Long> parseUserIds(String userIds) {
        if (userIds == null || userIds.isBlank()) {
            return null;
        }
        return Arrays.stream(userIds.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(Long::valueOf)
                .collect(Collectors.toSet());
    }
}
