package esprit.tn.backpi.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * MongoDB document used to emulate auto-increment Long IDs.
 * One document per collection (e.g. "users_sequence", "patient_contact_sequence").
 */
@Document(collection = "database_sequences")
public class DatabaseSequence {

    @Id
    private String id;

    private long seq;

    public DatabaseSequence() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public long getSeq() { return seq; }
    public void setSeq(long seq) { this.seq = seq; }
}
