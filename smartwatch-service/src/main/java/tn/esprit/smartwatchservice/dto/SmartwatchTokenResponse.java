package tn.esprit.smartwatchservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SmartwatchTokenResponse {

    private String token;
    private Long userId;
    private Instant expiresAt;
}
