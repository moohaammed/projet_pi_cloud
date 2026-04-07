package esprit.tn.collab.entities.collaboration;

import jakarta.persistence.*;
import java.util.HashSet;
import java.util.Set;

@Entity
public class MessagePollOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String text;
    private int votesCount = 0;

    @ElementCollection
    @CollectionTable(name = "message_poll_option_voters", joinColumns = @JoinColumn(name = "option_id"))
    @Column(name = "user_id")
    private Set<Long> voterIds = new HashSet<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id")
    private Message message;

    public MessagePollOption() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
    public int getVotesCount() { return votesCount; }
    public void setVotesCount(int votesCount) { this.votesCount = votesCount; }
    public Set<Long> getVoterIds() { return voterIds; }
    public void setVoterIds(Set<Long> voterIds) { this.voterIds = voterIds; }
    public Message getMessage() { return message; }
    public void setMessage(Message message) { this.message = message; }
}
