package esprit.tn.backpi.dto.collaboration.admin;

import lombok.Data;

@Data
public class SentimentDistributionDto {
    private long positive;
    private long neutral;
    private long negative;
}
