package esprit.tn.backpi.config;

import esprit.tn.backpi.entity.PatientContact;
import esprit.tn.backpi.service.SequenceGeneratorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.mapping.event.AbstractMongoEventListener;
import org.springframework.data.mongodb.core.mapping.event.BeforeConvertEvent;
import org.springframework.stereotype.Component;

/**
 * Intercepts every PatientContact.save() call.
 * Assigns a sequential Long ID when no ID is present.
 */
@Component
public class PatientContactModelListener extends AbstractMongoEventListener<PatientContact> {

    @Autowired
    private SequenceGeneratorService sequenceGenerator;

    @Override
    public void onBeforeConvert(BeforeConvertEvent<PatientContact> event) {
        PatientContact contact = event.getSource();
        if (contact.getId() == null) {
            contact.setId(sequenceGenerator.generateSequence(PatientContact.SEQUENCE_NAME));
        }
    }
}
