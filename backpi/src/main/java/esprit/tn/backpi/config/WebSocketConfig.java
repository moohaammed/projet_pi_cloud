package esprit.tn.backpi.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

import java.security.Principal;
import java.util.Map;
import java.util.UUID;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Native WebSocket endpoint (used by STOMPJS Client directly)
        registry.addEndpoint("/ws")
                .setAllowedOrigins("http://localhost:4200")
                .setHandshakeHandler(new UserHandshakeHandler());
                
        // SockJS fallback endpoint
        registry.addEndpoint("/ws")
                .setAllowedOrigins("http://localhost:4200")
                .setHandshakeHandler(new UserHandshakeHandler())
                .withSockJS();
    }

    private static class UserHandshakeHandler extends DefaultHandshakeHandler {
        @Override
        protected Principal determineUser(ServerHttpRequest request, WebSocketHandler wsHandler,
                Map<String, Object> attributes) {
            String query = request.getURI().getQuery();
            if (query != null && query.contains("userId=")) {
                String userId = query.split("userId=")[1].split("&")[0];
                System.out.println("STOMP [Handshake]: User identified as " + userId);
                return () -> userId;
            }
            String anonId = UUID.randomUUID().toString();
            System.out.println("STOMP [Handshake]: Anonymous user " + anonId);
            return () -> anonId;
        }
    }
}
