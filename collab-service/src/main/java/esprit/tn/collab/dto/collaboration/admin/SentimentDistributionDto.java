package esprit.tn.collab.dto.collaboration.admin;

public class SentimentDistributionDto {
    private long positive;
    private long neutral;
    private long negative;

    public long getPositive() { return positive; }
    public void setPositive(long positive) { this.positive = positive; }
    public long getNeutral() { return neutral; }
    public void setNeutral(long neutral) { this.neutral = neutral; }
    public long getNegative() { return negative; }
    public void setNegative(long negative) { this.negative = negative; }
}
