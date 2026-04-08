package esprit.tn.collab.entities.collaboration;

import java.util.HashSet;
import java.util.Set;

/** Embedded document inside Publication */
public class PublicationPollOption {

    private String id;
    private String text;
    private int votes = 0;
    private Set<Long> voterIds = new HashSet<>();

    public PublicationPollOption() {
        this.id = new org.bson.types.ObjectId().toHexString();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
    public int getVotes() { return votes; }
    public void setVotes(int votes) { this.votes = votes; }
    public Set<Long> getVoterIds() { return voterIds; }
    public void setVoterIds(Set<Long> voterIds) { this.voterIds = voterIds; }
    public void setPublication(Publication p) {} // no-op, kept for compatibility
}
