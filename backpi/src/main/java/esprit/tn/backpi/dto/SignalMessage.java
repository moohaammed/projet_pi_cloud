package esprit.tn.backpi.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SignalMessage {
    private String type; // offer, answer, ice-candidate
    private String senderId;
    private String recipientId;
    private Object data; // SDPOffer, SDPAnswer, or IceCandidate payload
    public String getType() {
        return type;
    }
}
