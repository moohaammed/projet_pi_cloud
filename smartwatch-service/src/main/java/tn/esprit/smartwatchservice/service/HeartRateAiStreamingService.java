package tn.esprit.smartwatchservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import tn.esprit.smartwatchservice.dto.HeartRateAiResultDto;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Manages SSE connections for live AI prediction streaming.
 *
 * Frontend clients subscribe via GET /api/heart-rate/ai/stream.
 * An optional userId parameter filters events per user.
 *
 * Follows the same pattern as HeartRateStreamingService.
 */
@Slf4j
@Service
public class HeartRateAiStreamingService {

    private record Subscriber(SseEmitter emitter, Long userId) { }

    private final List<Subscriber> subscribers = new CopyOnWriteArrayList<>();

    private final ObjectMapper objectMapper = new ObjectMapper();

    {
        objectMapper.findAndRegisterModules();
    }

    /**
     * Create a new SSE connection for AI prediction streaming.
     */
    public SseEmitter subscribe(Long userId) {
        SseEmitter emitter = new SseEmitter(5 * 60 * 1000L); // 5 minutes
        Subscriber sub = new Subscriber(emitter, userId);

        subscribers.add(sub);
        log.info("🤖 [AI SSE] New subscriber connected (userId={}). Total active: {}",
                userId != null ? userId : "ALL", subscribers.size());

        emitter.onCompletion(() -> {
            subscribers.remove(sub);
            log.info("🤖 [AI SSE] Subscriber disconnected (completed). Total active: {}", subscribers.size());
        });

        emitter.onTimeout(() -> {
            subscribers.remove(sub);
            log.info("🤖 [AI SSE] Subscriber disconnected (timeout). Total active: {}", subscribers.size());
        });

        emitter.onError(e -> {
            subscribers.remove(sub);
            log.warn("🤖 [AI SSE] Subscriber disconnected (error). Total active: {}", subscribers.size());
        });

        return emitter;
    }

    /**
     * Broadcast an AI prediction result to matching SSE clients.
     */
    public void broadcast(HeartRateAiResultDto result) {
        if (subscribers.isEmpty()) {
            log.debug("🤖 [AI SSE] No active subscribers, skipping broadcast.");
            return;
        }

        log.info("🤖 [AI SSE] Broadcasting AI result: status={}, userId={} to {} subscriber(s)",
                result.getStatus(), result.getUserId(), subscribers.size());

        List<Subscriber> dead = new ArrayList<>();

        for (Subscriber sub : subscribers) {
            if (sub.userId() != null && !sub.userId().equals(result.getUserId())) {
                continue;
            }

            try {
                String json = objectMapper.writeValueAsString(result);
                sub.emitter().send(SseEmitter.event()
                        .name("ai-prediction")
                        .data(json));
            } catch (IOException e) {
                log.warn("🤖 [AI SSE] Failed to send to subscriber, removing.");
                dead.add(sub);
            }
        }

        subscribers.removeAll(dead);
    }
}
