package tn.esprit.smartwatchservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tn.esprit.smartwatchservice.dto.SmartwatchTokenResponse;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SmartwatchTokenService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final String BEARER_PREFIX = "Bearer ";

    private final ObjectMapper objectMapper;

    @Value("${heartrate.smartwatch-token.secret:medisync-smartwatch-dev-secret-change-me}")
    private String tokenSecret;

    @Value("${heartrate.smartwatch-token.ttl-seconds:600}")
    private long ttlSeconds;

    public SmartwatchTokenResponse issueToken(Long userId) {
        Instant expiresAt = Instant.now().plusSeconds(ttlSeconds);
        TokenPayload payload = new TokenPayload(userId, expiresAt.getEpochSecond(), UUID.randomUUID().toString());
        String encodedPayload = encodePayload(payload);
        String signature = sign(encodedPayload);

        return SmartwatchTokenResponse.builder()
                .token(encodedPayload + "." + signature)
                .userId(userId)
                .expiresAt(expiresAt)
                .build();
    }

    public Long resolveUserId(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith(BEARER_PREFIX)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Smartwatch token is required");
        }

        String token = authorizationHeader.substring(BEARER_PREFIX.length()).trim();
        String[] parts = token.split("\\.", 2);
        if (parts.length != 2 || parts[0].isBlank() || parts[1].isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid smartwatch token");
        }

        String expectedSignature = sign(parts[0]);
        if (!MessageDigest.isEqual(
                expectedSignature.getBytes(StandardCharsets.UTF_8),
                parts[1].getBytes(StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid smartwatch token");
        }

        TokenPayload payload = decodePayload(parts[0]);
        if (payload.userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid smartwatch token");
        }

        if (payload.exp < Instant.now().getEpochSecond()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Smartwatch token expired");
        }

        return payload.userId;
    }

    private String encodePayload(TokenPayload payload) {
        try {
            byte[] json = objectMapper.writeValueAsBytes(payload);
            return Base64.getUrlEncoder().withoutPadding().encodeToString(json);
        } catch (Exception e) {
            throw new IllegalStateException("Could not create smartwatch token", e);
        }
    }

    private TokenPayload decodePayload(String encodedPayload) {
        try {
            byte[] json = Base64.getUrlDecoder().decode(encodedPayload);
            return objectMapper.readValue(json, TokenPayload.class);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid smartwatch token");
        }
    }

    private String sign(String value) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(tokenSecret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            byte[] signature = mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(signature);
        } catch (Exception e) {
            throw new IllegalStateException("Could not sign smartwatch token", e);
        }
    }

    @SuppressWarnings("unused")
    public static class TokenPayload {
        public Long userId;
        public long exp;
        public String nonce;

        public TokenPayload() {
        }

        public TokenPayload(Long userId, long exp, String nonce) {
            this.userId = userId;
            this.exp = exp;
            this.nonce = nonce;
        }
    }
}
