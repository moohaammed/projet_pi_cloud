package esprit.tn.patientmedecin.entities;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;

@Document(collection = "patient_notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Notificationpatient {

    @Transient
    public static final String SEQUENCE_NAME = "notifications_sequence";

    @Id
    private Long id;

    private String message;

    @Field("created_at")
    private LocalDateTime createdAt;

    @com.fasterxml.jackson.annotation.JsonProperty("isRead")
    @Field("lu")
    private boolean isRead = false;

    private String type;

    @DBRef
    private Patient patient;
}
