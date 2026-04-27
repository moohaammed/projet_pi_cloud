package esprit.tn.backpi.helpnotification.kafka;

import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.support.serializer.JsonDeserializer;

import esprit.tn.backpi.helpnotification.dto.HeartRateAlertEvent;

import java.util.HashMap;
import java.util.Map;

/**
 * Kafka consumer configuration for backpi.
 *
 * Creates a consumer factory and listener container factory
 * for deserializing HeartRateAlertEvent messages from the
 * "heartrate.alerts" topic.
 */
@Configuration
public class KafkaConsumerConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Bean
    public ConsumerFactory<String, HeartRateAlertEvent> alertConsumerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put(org.apache.kafka.clients.consumer.ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(org.apache.kafka.clients.consumer.ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(org.apache.kafka.clients.consumer.ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, JsonDeserializer.class);
        props.put(JsonDeserializer.TRUSTED_PACKAGES, "*");
        props.put(org.apache.kafka.clients.consumer.ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "latest");

        return new DefaultKafkaConsumerFactory<>(props, new StringDeserializer(),
                new JsonDeserializer<>(HeartRateAlertEvent.class, false));
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, HeartRateAlertEvent> kafkaListenerContainerFactory(
            ConsumerFactory<String, HeartRateAlertEvent> alertConsumerFactory) {
        ConcurrentKafkaListenerContainerFactory<String, HeartRateAlertEvent> factory =
                new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(alertConsumerFactory);
        return factory;
    }
}
