package esprit.tn.education.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Robust YouTube transcript and metadata fetcher.
 * Multi-strategy approach to ensure content is fetched even in restricted environments.
 */
@Service
public class YouTubeTranscriptService {

    private static final Logger log = LoggerFactory.getLogger(YouTubeTranscriptService.class);
    private static final int MAX_TRANSCRIPT_CHARS = 5000;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public String fetchTranscript(String youtubeUrl) {
        if (youtubeUrl == null || youtubeUrl.isBlank()) return "";

        String videoId = extractVideoId(youtubeUrl);
        if (videoId == null) {
            log.warn("Could not extract videoId from URL: {}", youtubeUrl);
            return "";
        }

        log.info("--- [DEBUG] START CONTENT FETCH for videoId={} ---", videoId);
        System.out.println("DEBUG: Investigating YouTube VideoID=" + videoId);

        // STRATEGY 1: InnerTube API (Android Client with ContentCheck)
        try {
            log.info("[Strategy 1] InnerTube ANDROID player API...");
            String response = callInnerTube(videoId, "ANDROID", "17.31.35");
            String result = processPlayerResponse(response, videoId);
            if (!result.isEmpty()) {
                System.out.println(">>> SUCCESS: YouTube Content fetched via Strategy 1 (Android API) for " + videoId);
                return result;
            }
        } catch (Exception e) {
            log.warn("[Strategy 1] Failed: {}", e.getMessage());
        }

        // STRATEGY 2: InnerTube API (Web Client)
        try {
            log.info("[Strategy 2] InnerTube WEB player API...");
            String response = callInnerTube(videoId, "WEB", "2.20230301.09.00");
            String result = processPlayerResponse(response, videoId);
            if (!result.isEmpty()) {
                System.out.println(">>> SUCCESS: YouTube Content fetched via Strategy 2 (Web API) for " + videoId);
                return result;
            }
        } catch (Exception e) {
            log.warn("[Strategy 2] Failed: {}", e.getMessage());
        }

        // STRATEGY 3: HTML Scraper (Enhanced playerResponse regex)
        try {
            log.info("[Strategy 3] HTML Scraping /watch?v=...");
            String html = fetchPageHtml(videoId);
            String json = extractPlayerResponseFromHtml(html);
            if (json != null) {
                String result = processPlayerResponse(json, videoId);
                if (!result.isEmpty()) {
                    System.out.println(">>> SUCCESS: YouTube Content fetched via Strategy 3 (HTML Scrape) for " + videoId);
                    return result;
                }
            }
        } catch (Exception e) {
            log.warn("[Strategy 3] Failed: {}", e.getMessage());
        }

        // STRATEGY 4: Direct TimedText API (Multi-language)
        try {
            log.info("[Strategy 4] Direct TimedText API...");
            String fr = fetchTimedText(videoId, "fr");
            if (!fr.isEmpty()) {
                System.out.println(">>> SUCCESS: YouTube Content fetched via Strategy 4 (Direct FR) for " + videoId);
                return fr;
            }
            String en = fetchTimedText(videoId, "en");
            if (!en.isEmpty()) {
                System.out.println(">>> SUCCESS: YouTube Content fetched via Strategy 4 (Direct EN) for " + videoId);
                return en;
            }
        } catch (Exception e) {
            log.warn("[Strategy 4] Failed: {}", e.getMessage());
        }

        log.error("--- All content strategies failed for {} ---", videoId);
        return "";
    }

    private String callInnerTube(String videoId, String clientName, String clientVersion) {
        WebClient client = WebClient.builder()
                .baseUrl("https://www.youtube.com")
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.USER_AGENT, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/110.0.0.0")
                .defaultHeader(HttpHeaders.COOKIE, "CONSENT=YES+cb.20230301-07-p0.fr+FX+999")
                .build();

        Map<String, Object> body = Map.of(
            "videoId", videoId,
            "contentCheckOk", true,
            "racyCheckOk", true,
            "context", Map.of(
                "client", Map.of(
                    "clientName", clientName,
                    "clientVersion", clientVersion,
                    "hl", "fr",
                    "gl", "FR"
                )
            )
        );

        return client.post()
                .uri("/youtubei/v1/player")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(12))
                .block();
    }

    private String processPlayerResponse(String json, String videoId) {
        try {
            if (json == null || json.isEmpty()) return "";
            JsonNode root = objectMapper.readTree(json);
            
            // Extract the RICH description from YouTube metadata
            String metaDesc = root.path("videoDetails").path("shortDescription").asText("").trim();
            if (!metaDesc.isEmpty()) {
                log.info("Successfully extracted YouTube metadata description ({} chars)", metaDesc.length());
            }

            JsonNode captionsNode = root.path("captions").path("playerCaptionsTracklistRenderer");
            if (captionsNode.isMissingNode()) {
                log.warn("Captions tracklist missing for {}. Returning description only.", videoId);
                return metaDesc.isEmpty() ? "" : "[DESC] " + metaDesc;
            }

            JsonNode tracks = captionsNode.path("captionTracks");
            if (!tracks.isArray() || tracks.isEmpty()) {
                return metaDesc.isEmpty() ? "" : "[DESC] " + metaDesc;
            }

            String bestTrackUrl = null;
            String bestLang = "";

            for (JsonNode track : tracks) {
                String baseUrl = track.path("baseUrl").asText("");
                String lang    = track.path("languageCode").asText("");
                String kind    = track.path("kind").asText("");
                if (baseUrl.isEmpty()) continue;

                if (lang.equals("fr") && !kind.equals("asr")) { bestTrackUrl = baseUrl; bestLang="fr (manual)"; break; }
                if (lang.equals("fr")) { bestTrackUrl = baseUrl; bestLang="fr (auto)"; }
                if (bestTrackUrl == null && lang.startsWith("en")) { bestTrackUrl = baseUrl; bestLang="en"; }
                if (bestTrackUrl == null) { bestTrackUrl = baseUrl; bestLang=lang; }
            }

            if (bestTrackUrl != null) {
                log.info("Found caption track ({}). Fetching transcript data...", bestLang);
                String finalUrl = bestTrackUrl + (bestTrackUrl.contains("?") ? "&" : "?") + "fmt=json3";
                String raw = WebClient.create().get().uri(finalUrl).retrieve().bodyToMono(String.class).block();
                return parseJson3Transcript(raw);
            }
            
            return metaDesc.isEmpty() ? "" : "[DESC] " + metaDesc;
        } catch (Exception e) {
            log.warn("Error processing playerResponse: {}", e.getMessage());
        }
        return "";
    }

    private String fetchTimedText(String videoId, String lang) {
        try {
            String url = "https://www.youtube.com/api/timedtext?v=" + videoId + "&lang=" + lang + "&fmt=json3";
            String json = WebClient.create().get().uri(url).retrieve().bodyToMono(String.class).timeout(Duration.ofSeconds(8)).block();
            if (json != null && !json.contains("\"events\": []")) {
                return parseJson3Transcript(json);
            }
        } catch (Exception ignored) {}
        return "";
    }

    private String parseJson3Transcript(String json) throws Exception {
        JsonNode root = objectMapper.readTree(json);
        JsonNode events = root.path("events");
        if (!events.isArray()) return "";

        StringBuilder sb = new StringBuilder();
        for (JsonNode event : events) {
            JsonNode segs = event.path("segs");
            if (segs.isArray()) {
                for (JsonNode seg : segs) {
                    String utf8 = seg.path("utf8").asText("");
                    if (!utf8.isEmpty() && !utf8.equals("\n")) {
                        sb.append(utf8).append(" ");
                    }
                }
            }
        }
        String res = sb.toString().replaceAll("\\s+", " ").trim();
        return res.length() > MAX_TRANSCRIPT_CHARS ? res.substring(0, MAX_TRANSCRIPT_CHARS) + "..." : res;
    }

    private String fetchPageHtml(String videoId) {
        return WebClient.builder()
                .baseUrl("https://www.youtube.com")
                .defaultHeader(HttpHeaders.USER_AGENT, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/110.0.0.0")
                .defaultHeader(HttpHeaders.COOKIE, "CONSENT=YES+cb.20230301-07-p0.fr+FX+999")
                .build()
                .get()
                .uri("/watch?v=" + videoId + "&hl=fr")
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(10))
                .block();
    }

    private String extractPlayerResponseFromHtml(String html) {
        Pattern pattern = Pattern.compile("ytInitialPlayerResponse\\s*=\\s*(\\{.+?\\})\\s*;");
        Matcher matcher = pattern.matcher(html);
        if (matcher.find()) return matcher.group(1);
        
        // Fallback for different HTML structures
        pattern = Pattern.compile("var\\s+ytInitialPlayerResponse\\s*=\\s*(\\{.+?\\})\\s*;");
        matcher = pattern.matcher(html);
        if (matcher.find()) return matcher.group(1);
        
        return null;
    }

    public String extractVideoId(String url) {
        if (url == null) return null;
        Pattern pattern = Pattern.compile("(?:v=|v/|vi/|youtu\\.be/|embed/|shorts/|watch\\?v=|&v=)([a-zA-Z0-9_-]{11})");
        Matcher matcher = pattern.matcher(url);
        if (matcher.find()) return matcher.group(1);
        
        String trimmed = url.trim();
        if (trimmed.length() == 11 && trimmed.matches("[a-zA-Z0-9_-]{11}")) return trimmed;
        return null;
    }
}
