package esprit.tn.collab.dto.collaboration.admin;

import java.time.Instant;

public class DirectMessageMetadataDto {
    private Long userIdA;
    private Long userIdB;
    private long messageCount;
    private Instant lastActivity;
    private long distressedMessageCount;

    public Long getUserIdA() { return userIdA; }
    public void setUserIdA(Long userIdA) { this.userIdA = userIdA; }
    public Long getUserIdB() { return userIdB; }
    public void setUserIdB(Long userIdB) { this.userIdB = userIdB; }
    public long getMessageCount() { return messageCount; }
    public void setMessageCount(long messageCount) { this.messageCount = messageCount; }
    public Instant getLastActivity() { return lastActivity; }
    public void setLastActivity(Instant lastActivity) { this.lastActivity = lastActivity; }
    public long getDistressedMessageCount() { return distressedMessageCount; }
    public void setDistressedMessageCount(long distressedMessageCount) { this.distressedMessageCount = distressedMessageCount; }
}
