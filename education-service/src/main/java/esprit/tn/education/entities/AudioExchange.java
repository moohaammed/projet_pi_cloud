package esprit.tn.education.entities;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AudioExchange {

    /** AI or PATIENT */
    private String speaker;

    private String text;

    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
}
