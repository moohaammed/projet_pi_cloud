package tn.esprit.smartwatchservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import tn.esprit.smartwatchservice.dto.HeartRateViewDto;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Manages SSE (Server-Sent Events) connections for live heart-rate streaming.
 *
 * Frontend clients subscribe via GET /api/heart-rate/stream.
 * An optional userId parameter filters events so that each client
 * only receives readings for the requested user.
 *
 * The stream Kafka consumer calls broadcast() to push events
 * to matching connected clients in real time.
 */
@Slf4j
@Service
public class HeartRateStreamingService {

    private static final long LIVE_TIMEOUT_MS = 5000L;

    /**
     * Pairs an SseEmitter with an optional userId filter.
     * If userId is null, the subscriber receives ALL events.
     */
    private record Subscriber(SseEmitter emitter, Long userId, Set<Long> userIds) { }

    /** Thread-safe list of active subscribers */
    private final List<Subscriber> subscribers = new CopyOnWriteArrayList<>();
    private final ConcurrentHashMap<Long, HeartRateViewDto> latestLiveEvents = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, Long> latestLiveEventMillis = new ConcurrentHashMap<>();

    private final ObjectMapper objectMapper = new ObjectMapper();

    {
        // Register JavaTimeModule for Instant serialization
        objectMapper.findAndRegisterModules();
    }

    /**
     * Create a new SSE connection for a frontend client.
     *
     * @param userId optional — if provided, only events for this user are streamed.
     *               If null, the subscriber receives events for ALL users.
     */
    public SseEmitter subscribe(Long userId) {
        return subscribe(userId, null);
    }

    public SseEmitter subscribe(Long userId, Set<Long> userIds) {
        SseEmitter emitter = new SseEmitter(5 * 60 * 1000L); // 5 minutes
        Subscriber sub = new Subscriber(emitter, userId, normalizeUserIds(userIds));

        subscribers.add(sub);
        log.info("📡 [SSE] New subscriber connected (userId={}, userIds={}). Total active: {}",
                userId != null ? userId : "ALL",
                sub.userIds() != null ? sub.userIds() : "ALL",
                subscribers.size());

        emitter.onCompletion(() -> {
            subscribers.remove(sub);
            log.info("📡 [SSE] Subscriber disconnected (completed). Total active: {}", subscribers.size());
        });

        emitter.onTimeout(() -> {
            subscribers.remove(sub);
            log.info("📡 [SSE] Subscriber disconnected (timeout). Total active: {}", subscribers.size());
        });

        emitter.onError(e -> {
            subscribers.remove(sub);
            log.warn("📡 [SSE] Subscriber disconnected (error). Total active: {}", subscribers.size());
        });

        return emitter;
    }

    /**
     * Broadcast a heart-rate event to matching SSE clients.
     * A subscriber matches if its userId filter is null (wildcard)
     * or equals the event's userId.
     */
    public void broadcast(HeartRateViewDto viewDto) {
        if (viewDto.getUserId() != null) {
            latestLiveEvents.put(viewDto.getUserId(), viewDto);
            latestLiveEventMillis.put(viewDto.getUserId(), System.currentTimeMillis());
        }

        if (subscribers.isEmpty()) {
            log.debug("📡 [SSE] No active subscribers, skipping broadcast.");
            return;
        }

        log.info("📡 [SSE] Broadcasting bpm={}, userId={} to {} subscriber(s)",
                viewDto.getBpm(), viewDto.getUserId(), subscribers.size());

        List<Subscriber> dead = new ArrayList<>();

        for (Subscriber sub : subscribers) {
            // Filter: skip if subscriber requested a specific user and it doesn't match
            if (!matches(sub, viewDto.getUserId())) {
                continue;
            }

            try {
                String json = objectMapper.writeValueAsString(viewDto);
                sub.emitter().send(SseEmitter.event()
                        .name("heartrate")
                        .data(json));
            } catch (IOException e) {
                log.warn("📡 [SSE] Failed to send to subscriber, removing.");
                dead.add(sub);
            }
        }

        subscribers.removeAll(dead);
    }

    public Optional<HeartRateViewDto> getLatestLiveEvent(Long userId) {
        if (userId == null || !isConnected(userId)) {
            return Optional.empty();
        }
        return Optional.ofNullable(latestLiveEvents.get(userId));
    }

    public boolean isConnected(Long userId) {
        Long lastSeen = latestLiveEventMillis.get(userId);
        return lastSeen != null && System.currentTimeMillis() - lastSeen <= LIVE_TIMEOUT_MS;
    }

    private boolean matches(Subscriber sub, Long eventUserId) {
        if (sub.userId() != null) {
            return sub.userId().equals(eventUserId);
        }
        if (sub.userIds() != null && !sub.userIds().isEmpty()) {
            return sub.userIds().contains(eventUserId);
        }
        return true;
    }

    private Set<Long> normalizeUserIds(Collection<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return null;
        }
        return Set.copyOf(userIds);
    }
}
