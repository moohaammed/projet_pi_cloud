package esprit.tn.backpi.controller;

import esprit.tn.backpi.dto.SignalMessage;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class SignalingController {

    @MessageMapping("/call/{roomId}")
    @SendTo("/topic/call/{roomId}")
    public SignalMessage handleSignaling(@DestinationVariable String roomId, @Payload SignalMessage message) {
        System.out.println("Processing signal of type " + message.getType() + " for room " + roomId);
        return message;
    }
}
