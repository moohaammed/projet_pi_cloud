package esprit.tn.collab.dto.collaboration.admin;

public class EngagementMixDto {
    private long publications;
    private long comments;
    private long messages;
    private long shares;

    public long getPublications() { return publications; }
    public void setPublications(long publications) { this.publications = publications; }
    public long getComments() { return comments; }
    public void setComments(long comments) { this.comments = comments; }
    public long getMessages() { return messages; }
    public void setMessages(long messages) { this.messages = messages; }
    public long getShares() { return shares; }
    public void setShares(long shares) { this.shares = shares; }
}
