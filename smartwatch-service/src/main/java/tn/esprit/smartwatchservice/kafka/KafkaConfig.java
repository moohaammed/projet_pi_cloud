package tn.esprit.smartwatchservice.kafka;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

/**
 * Kafka topic configuration for the Heart Beat service.
 * Creates required topics on startup if they don't exist.
 */
@Configuration
public class KafkaConfig {

    @Value("${heartrate.topic.raw}")
    private String rawTopic;

    @Value("${heartrate.topic.alerts}")
    private String alertsTopic;

    /**
     * Primary topic for raw heart-rate events.
     * All internal consumers subscribe to this topic.
     */
    @Bean
    public NewTopic heartRateRawTopic() {
        return TopicBuilder.name(rawTopic)
                .partitions(3)
                .replicas(1)
                .build();
    }

    /**
     * Topic for structured heart-rate alert events.
     * Published by HeartRateAlertProducer when danger conditions are detected.
     * Consumed by backpi's HeartRateHelpNotificationConsumer.
     */
    @Bean
    public NewTopic heartRateAlertsTopic() {
        return TopicBuilder.name(alertsTopic)
                .partitions(3)
                .replicas(1)
                .build();
    }
}
