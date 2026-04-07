package esprit.tn.collab.entities.collaboration;

import jakarta.persistence.*;
import java.util.HashSet;
import java.util.Set;

@Entity
public class PublicationPollOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String text;
    private int votes = 0;

    @ElementCollection
    @CollectionTable(name = "publication_poll_option_voters", joinColumns = @JoinColumn(name = "option_id"))
    @Column(name = "user_id")
    private Set<Long> voterIds = new HashSet<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "publication_id")
    private Publication publication;

    public PublicationPollOption() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
    public int getVotes() { return votes; }
    public void setVotes(int votes) { this.votes = votes; }
    public Set<Long> getVoterIds() { return voterIds; }
    public void setVoterIds(Set<Long> voterIds) { this.voterIds = voterIds; }
    public Publication getPublication() { return publication; }
    public void setPublication(Publication publication) { this.publication = publication; }
}
