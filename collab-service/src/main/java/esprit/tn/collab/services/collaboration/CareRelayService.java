package esprit.tn.collab.services.collaboration;

import esprit.tn.collab.dto.collaboration.HandoverDTO;
import esprit.tn.collab.entities.collaboration.Message;
import esprit.tn.collab.entities.collaboration.Publication;
import esprit.tn.collab.entities.collaboration.PublicationType;
import esprit.tn.collab.repositories.collaboration.MessageRepository;
import esprit.tn.collab.repositories.collaboration.PublicationRepository;
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
    private final HandoverService handoverService;

    public CareRelayService(MessageRepository messageRepository,
                            PublicationRepository publicationRepository,
                            SentimentAnalysisService sentimentAnalysisService,
                            HandoverService handoverService) {
        this.messageRepository = messageRepository;
        this.publicationRepository = publicationRepository;
        this.sentimentAnalysisService = sentimentAnalysisService;
        this.handoverService = handoverService;
    }

    public HandoverDTO generateHandoverSummary(String groupId, int hours) {
        Instant since = Instant.now().minus(hours, ChronoUnit.HOURS);
        List<Message> messages = messageRepository.findByChatGroupIdAndSentAtAfterOrderBySentAtAsc(groupId, since);
        List<Publication> publications = publicationRepository.findByCreatedAtAfterOrderByCreatedAtDesc(since);

        for (Message msg : messages) {
            if (msg.getSentimentScore() == null || msg.getSentimentScore() == 0.0) {
                Double score = sentimentAnalysisService.calculateSentimentScore(msg.getContent());
                msg.setSentimentScore(score);
                msg.setDistressed(score <= -0.5);
                messageRepository.save(msg);
            }
        }

        double averageSentiment = messages.stream()
                .mapToDouble(m -> m.getSentimentScore() != null ? m.getSentimentScore() : 0.0)
                .average().orElse(0.0);

        List<String> highRiskKeywords = List.of("sick", "lost", "fell", "pain", "emergency", "fever", "disappeared", "unconscious", "bleeding");
        List<String> criticalAlerts = messages.stream()
                .filter(m -> (m.getSentimentScore() != null && m.getSentimentScore() < -0.7)
                        || (m.getContent() != null && highRiskKeywords.stream().anyMatch(k -> m.getContent().toLowerCase().contains(k))))
                .map(m -> {
                    String tag = (m.getSentimentScore() != null && m.getSentimentScore() < -0.7) ? "[CRITICAL]" : "[URGENT]";
                    String sender = m.getSenderId() != null ? "User " + m.getSenderId() : "Unknown";
                    return tag + " " + sender + ": \"" + truncate(m.getContent(), 120) + "\"";
                }).collect(Collectors.toList());

        List<String> pendingTasks = new ArrayList<>();
        for (Message msg : messages) {
            if (msg.getContent() != null && msg.getContent().trim().endsWith("?")) {
                boolean hasReply = messages.stream().anyMatch(reply ->
                        reply.getParentMessageId() != null && reply.getParentMessageId().equals(msg.getId())
                        && !reply.getSenderId().equals(msg.getSenderId()));
                if (!hasReply) {
                    pendingTasks.add("Unanswered question from User " + msg.getSenderId() + ": \"" + truncate(msg.getContent(), 100) + "\"");
                }
            }
        }

        List<Publication> polls = publications.stream().filter(p -> p.getType() == PublicationType.VOTE).collect(Collectors.toList());

        HandoverDTO dto = new HandoverDTO();
        dto.setSummary(handoverService.generateHandoverSummary(groupId, hours));
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
