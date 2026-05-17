package esprit.tn.patientmedecin.entities;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import org.springframework.data.mongodb.core.mapping.Field;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserInfo {
    @Field("_id")
    private Long id;
    private String email;
    private String telephone;
    private String fcmToken;
}
