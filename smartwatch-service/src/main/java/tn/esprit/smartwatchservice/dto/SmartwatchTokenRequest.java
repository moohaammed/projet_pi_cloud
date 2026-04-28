package tn.esprit.smartwatchservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SmartwatchTokenRequest {

    @NotNull(message = "userId is required")
    private Long userId;
}
