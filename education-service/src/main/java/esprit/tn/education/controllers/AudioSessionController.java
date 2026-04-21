package esprit.tn.education.controllers;

import esprit.tn.education.dto.*;
import esprit.tn.education.services.AudioSessionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/audio-sessions")
public class AudioSessionController {

    @Autowired
    private AudioSessionService audioSessionService;

    /**
     * Initialise a new audio session for a CONTENT activity.
     * POST /api/audio-sessions/init
     */
    @PostMapping("/init")
    public ResponseEntity<InitSessionResponse> init(@RequestBody InitSessionRequest req) {
        return ResponseEntity.ok(audioSessionService.initSession(req));
    }

    /**
     * Submit the patient's spoken answer (or empty string for silence).
     * POST /api/audio-sessions/{id}/process-answer
     */
    @PostMapping("/{id}/process-answer")
    public ResponseEntity<ProcessAnswerResponse> processAnswer(
            @PathVariable String id,
            @RequestBody ProcessAnswerRequest req) {
        return ResponseEntity.ok(audioSessionService.processAnswer(id, req));
    }

    /**
     * Re-read the current question (patient pressed "Répéter").
     * POST /api/audio-sessions/{id}/repeat
     */
    @PostMapping("/{id}/repeat")
    public ResponseEntity<ProcessAnswerResponse> repeat(@PathVariable String id) {
        return ResponseEntity.ok(audioSessionService.repeatQuestion(id));
    }

    /**
     * Stop the session early (patient pressed "Arrêter").
     * POST /api/audio-sessions/{id}/stop
     */
    @PostMapping("/{id}/stop")
    public ResponseEntity<ProcessAnswerResponse> stop(@PathVariable String id) {
        return ResponseEntity.ok(audioSessionService.stopSession(id));
    }
}
