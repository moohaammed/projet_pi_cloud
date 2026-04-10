package esprit.tn.collab.entities.collaboration;

import java.util.HashSet;
import java.util.Set;

/**
 * Embedded document inside Message — no @Document, no @Id needed.
 * MongoDB stores this as a nested array element.
 */
public class MessagePollOption {

    private String id; // generated manually
    private String text;
    private int votesCount = 0;
    private Set<Long> voterIds = new HashSet<>();

    public MessagePollOption() {
        this.id = new org.bson.types.ObjectId().toHexString();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
    public int getVotesCount() { return votesCount; }
    public void setVotesCount(int votesCount) { this.votesCount = votesCount; }
    public Set<Long> getVoterIds() { return voterIds; }
    public void setVoterIds(Set<Long> voterIds) { this.voterIds = voterIds; }
    // message back-reference not needed in embedded doc
}
