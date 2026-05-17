package esprit.tn.backpi.service;

import esprit.tn.backpi.entity.DatabaseSequence;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoOperations;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.util.Objects;

import static org.springframework.data.mongodb.core.FindAndModifyOptions.options;
import static org.springframework.data.mongodb.core.query.Criteria.where;
import static org.springframework.data.mongodb.core.query.Query.query;

/**
 * Generates sequential Long IDs for MongoDB documents to preserve
 * compatibility with inter-service Long references (userId, patientId, etc.)
 */
@Service
public class SequenceGeneratorService {

    @Autowired
    private MongoOperations mongoOperations;

    /**
     * Atomically increments and returns the next Long value for the given sequence name.
     * The sequence document is created automatically on first call (upsert).
     *
     * @param seqName e.g. User.SEQUENCE_NAME or PatientContact.SEQUENCE_NAME
     * @return next sequential id (starts at 1)
     */
    public long generateSequence(String seqName) {
        DatabaseSequence counter = mongoOperations.findAndModify(
                query(where("_id").is(seqName)),
                new Update().inc("seq", 1),
                options().returnNew(true).upsert(true),
                DatabaseSequence.class
        );
        return !Objects.isNull(counter) ? counter.getSeq() : 1;
    }
}
