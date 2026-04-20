package tn.esprit.smartwatchservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.smartwatchservice.dto.HeartRateAcceptedResponse;
import tn.esprit.smartwatchservice.dto.HeartRateIngestRequest;
import tn.esprit.smartwatchservice.service.HeartRateIngestionService;

/**
 * REST controller for async heart-rate ingestion.
 *
 * The Python BLE collector sends readings here.
 * Validated events are published to Kafka and a 202 Accepted is returned.
 * Persistence and streaming happen asynchronously via Kafka consumers.
 */
@Slf4j
@RestController
@RequestMapping("/api/heart-rate")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class HeartRateIngestionController {

    private final HeartRateIngestionService ingestionService;

    /**
     * POST /api/heart-rate/ingest
     *
     * Accepts a heart-rate reading from the BLE collector,
     * publishes it to Kafka, and returns 202 Accepted immediately.
     */
    @PostMapping("/ingest")
    public ResponseEntity<HeartRateAcceptedResponse> ingest(
            @Valid @RequestBody HeartRateIngestRequest request) {

        log.info("🔔 [INGEST ENDPOINT] Received — userId={}, bpm={}, device={}",
                request.getUserId(), request.getBpm(), request.getDeviceName());

        String eventId = ingestionService.ingest(request);

        HeartRateAcceptedResponse response = HeartRateAcceptedResponse.builder()
                .status("ACCEPTED")
                .eventId(eventId)
                .message("Heart-rate event accepted for async processing")
                .build();

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }
}
