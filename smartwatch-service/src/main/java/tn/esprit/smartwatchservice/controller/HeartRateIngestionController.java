package tn.esprit.smartwatchservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tn.esprit.smartwatchservice.dto.HeartRateAcceptedResponse;
import tn.esprit.smartwatchservice.dto.HeartRateIngestRequest;
import tn.esprit.smartwatchservice.service.HeartRateIngestionService;
import tn.esprit.smartwatchservice.service.SmartwatchTokenService;

/**
 * REST controller for async heart-rate ingestion.
 *
 * The Python BLE collectors send readings here. The legacy dev collector can
 * keep sending userId directly; the token-based collector omits userId and is
 * resolved through the short-lived smartwatch token.
 */
@Slf4j
@RestController
@RequestMapping("/api/heart-rate")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class HeartRateIngestionController {

    private final HeartRateIngestionService ingestionService;
    private final SmartwatchTokenService smartwatchTokenService;

    @PostMapping("/ingest")
    public ResponseEntity<HeartRateAcceptedResponse> ingest(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @Valid @RequestBody HeartRateIngestRequest request) {

        if (request.getUserId() == null) {
            Long resolvedUserId = smartwatchTokenService.resolveUserId(authorizationHeader);
            request.setUserId(resolvedUserId);
        }

        log.info("[INGEST ENDPOINT] Received userId={}, bpm={}, device={}",
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
