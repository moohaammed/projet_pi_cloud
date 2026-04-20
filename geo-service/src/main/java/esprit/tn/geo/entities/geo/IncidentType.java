package esprit.tn.geo.entities.geo;

/**
 * Type d'incident détecté par analyse CLIP.
 */
public enum IncidentType {
    TROU,
    OBSTACLE,
    ESCALIER,
    ACCIDENT,        // ← nouveau
    CHUTE_PERSONNE,  // ← nouveau
    INCENDIE,        // ← nouveau
    INONDATION,      // ← nouveau
    CHUTE,
    ZONE_DANGEREUSE,
    AUTRE
}