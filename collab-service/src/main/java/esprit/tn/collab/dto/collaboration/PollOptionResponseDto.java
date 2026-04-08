package esprit.tn.collab.dto.collaboration;

import java.util.Set;

public class PollOptionResponseDto {
    private String id;
    private String text;
    private int votes;
    private Set<Long> voterIds;

    public PollOptionResponseDto() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
    public int getVotes() { return votes; }
    public void setVotes(int votes) { this.votes = votes; }
    public Set<Long> getVoterIds() { return voterIds; }
    public void setVoterIds(Set<Long> voterIds) { this.voterIds = voterIds; }
}
