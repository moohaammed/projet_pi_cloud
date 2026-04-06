package esprit.tn.backpi.entities.collaboration;

public enum MessageType {
    TEXT,
    POLL,
    PUBLICATION,
    BOT_MESSAGE,
    /** CareBot medication check-in (shows Yes/No in the app). */
    MEDICATION_REMINDER
}
