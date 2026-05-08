package tn.esprit.smartwatchservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tn.esprit.smartwatchservice.dto.SmartwatchTokenRequest;
import tn.esprit.smartwatchservice.dto.SmartwatchTokenResponse;
import tn.esprit.smartwatchservice.service.SmartwatchTokenService;

@RestController
@RequestMapping("/api/heart-rate")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class SmartwatchTokenController {

    private final SmartwatchTokenService smartwatchTokenService;

    @PostMapping("/smartwatch-token")
    public ResponseEntity<SmartwatchTokenResponse> createToken(
            @Valid @RequestBody SmartwatchTokenRequest request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(smartwatchTokenService.issueToken(request.getUserId()));
    }
}
