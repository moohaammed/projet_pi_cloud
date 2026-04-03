package esprit.tn.backpi.services.collaboration;

import esprit.tn.backpi.dto.collaboration.HandoverDTO;
import esprit.tn.backpi.entities.collaboration.Message;
import esprit.tn.backpi.entities.collaboration.Publication;
import esprit.tn.backpi.entities.collaboration.PublicationType;
import esprit.tn.backpi.repositories.collaboration.MessageRepository;
import esprit.tn.backpi.repositories.collaboration.PublicationRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CareRelayService {

    private final MessageRepository messageRepository;
    private final PublicationRepository publicationRepository;
    private final SentimentAnalysisService sentimentAnalysisService;

    public CareRelayService(MessageRepository messageRepository,
                            PublicationRepository publicationRepository,
                            SentimentAnalysisService sentimentAnalysisService) {
        this.messageRepository = messageRepository;
        this.publicationRepository = publicationRepository;
        this.sentimentAnalysisService = sentimentAnalysisService;
    }

    /**
     * Generates a shift-handover summary for the specified group over the last N hours.
     *
     * @param groupId the chat group to summarize
     * @param hours   how many hours back to look
     * @return a HandoverDTO with summary text, critical alerts, and pending tasks
     */
    public HandoverDTO generateHandoverSummary(Long groupId, int hours) {
        Instant since = Instant.now().minus(hours, ChronoUnit.HOURS);

        // ── 1. Data Retrieval ──────────────────────────────────────────────
        List<Message> messages = messageRepository
                .findByChatGroupIdAndSentAtAfterOrderBySentAtAsc(groupId, since);

        List<Publication> publications = publicationRepository
                .findByCreatedAtAfterOrderByCreatedAtDesc(since);

        // ── 2. Ensure every message has a sentiment score (Hugging Face) ──
        for (Message msg : messages) {
            if (msg.getSentimentScore() == null || msg.getSentimentScore() == 0.0) {
                Double score = sentimentAnalysisService.calculateSentimentScore(msg.getContent());
                msg.setSentimentScore(score);
                msg.setDistressed(score <= -0.5);
                messageRepository.save(msg);
            }
        }

        // ── 3. Analysis ───────────────────────────────────────────────────
        // 3a. Sentiment Trend
        double averageSentiment = messages.stream()
                .mapToDouble(m -> m.getSentimentScore() != null ? m.getSentimentScore() : 0.0)
                .average()
                .orElse(0.0);

        // 3b. Critical Alerts (sentiment < -0.7 OR high-risk keywords)
        List<String> highRiskKeywords = List.of("sick", "lost", "fell", "pain", "emergency", "fever", "disappeared", "unconscious", "bleeding");
        
        List<String> criticalAlerts = messages.stream()
                .filter(m -> {
                    if (m.getSentimentScore() != null && m.getSentimentScore() < -0.7) return true;
                    if (m.getContent() == null) return false;
                    String lowerContent = m.getContent().toLowerCase();
                    return highRiskKeywords.stream().anyMatch(keyword -> lowerContent.contains(keyword.toLowerCase()));
                })
                .map(m -> {
                    String senderName = m.getSender() != null && m.getSender().getName() != null
                            ? m.getSender().getName() : "Unknown";
                    String tag = (m.getSentimentScore() != null && m.getSentimentScore() < -0.7) ? "[CRITICAL]" : "[URGENT]";
                    return tag + " " + senderName + ": \"" + truncate(m.getContent(), 120) + "\"";
                })
                .collect(Collectors.toList());

        // 3c. Action Items — unanswered questions (messages ending in ?)
        List<String> pendingTasks = new ArrayList<>();
        for (Message msg : messages) {
            if (msg.getContent() != null && msg.getContent().trim().endsWith("?")) {
                boolean hasReply = messages.stream().anyMatch(reply ->
                        reply.getParentMessage() != null
                                && reply.getParentMessage().getId().equals(msg.getId())
                                && !reply.getSender().getId().equals(msg.getSender().getId()));
                if (!hasReply) {
                    String senderName = msg.getSender() != null && msg.getSender().getName() != null
                            ? msg.getSender().getName() : "Unknown";
                    pendingTasks.add("Unanswered question from " + senderName + ": \""
                            + truncate(msg.getContent(), 100) + "\"");
                }
            }
        }

        // 3d. Poll Results — VOTE-type publications updated in the window
        List<Publication> polls = publications.stream()
                .filter(p -> p.getType() == PublicationType.VOTE)
                .collect(Collectors.toList());

        // ── 4. Mood label ─────────────────────────────────────────────────
        String moodLabel;
        if (averageSentiment > 0.3) moodLabel = "Positive";
        else if (averageSentiment < -0.3) moodLabel = "Concerning";
        else moodLabel = "Stable";

        // ── 5. Build summary text ─────────────────────────────────────────
        String summaryText = String.format(
                "%d messages, %d publications, %d poll(s) | Mood: %s (avg %.2f) | %d alert(s), %d pending question(s)",
                messages.size(), publications.size(), polls.size(),
                moodLabel, averageSentiment,
                criticalAlerts.size(), pendingTasks.size());

        // ── 6. Assemble DTO ───────────────────────────────────────────────
        HandoverDTO dto = new HandoverDTO();
        dto.setSummary(summaryText);
        dto.setCriticalAlerts(criticalAlerts);
        dto.setPendingTasks(pendingTasks);
        dto.setAverageSentiment(Math.round(averageSentiment * 100.0) / 100.0);
        dto.setTotalMessages(messages.size());
        dto.setTotalPublications(publications.size());
        dto.setPollCount(polls.size());

        return dto;
    }

    private String truncate(String text, int maxLen) {
        if (text == null) return "";
        return text.length() <= maxLen ? text : text.substring(0, maxLen) + "...";
    }
}
