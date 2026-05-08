package esprit.tn.backpi.config;

import esprit.tn.backpi.entity.User;
import esprit.tn.backpi.service.SequenceGeneratorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.mapping.event.AbstractMongoEventListener;
import org.springframework.data.mongodb.core.mapping.event.BeforeConvertEvent;
import org.springframework.stereotype.Component;

/**
 * Intercepts every User.save() call.
 * If the document has no ID yet, generates the next sequential Long from the sequence collection.
 * This means zero changes are required in any controller or service that calls userRepository.save().
 */
@Component
public class UserModelListener extends AbstractMongoEventListener<User> {

    @Autowired
    private SequenceGeneratorService sequenceGenerator;

    @Override
    public void onBeforeConvert(BeforeConvertEvent<User> event) {
        User user = event.getSource();
        if (user.getId() == null) {
            user.setId(sequenceGenerator.generateSequence(User.SEQUENCE_NAME));
        }
    }
}
