package esprit.tn.education.dto;

import lombok.Data;

@Data
public class InitSessionRequest {
    private String activityId;
    private String patientId;
    /** The activity description used as fallback context */
    private String activityDescription;
    /** Optional: activity title for richer context */
    private String activityTitle;
    /** Full YouTube URL — used to fetch real transcript for the LLM */
    private String videoUrl;
    /** Language for the session: "fr" (default) or "en" */
    private String language = "fr";
}
