package esprit.tn.geo.services.geo;

import esprit.tn.geo.dto.IncidentRequest;
import esprit.tn.geo.entities.geo.Incident;
import esprit.tn.geo.entities.geo.IncidentStatus;
import esprit.tn.geo.entities.geo.IncidentType;
import esprit.tn.geo.repositories.geo.IncidentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class IncidentService {

    @Autowired
    private IncidentRepository incidentRepository;

    // Mapping label CLIP → [titre, description, IncidentType]
    private static final Map<String, String[]> LABEL_INFO = Map.ofEntries(
            Map.entry("dangerous hole",           new String[]{"Trou dangereux détecté",       "Un trou dangereux a été détecté sur le chemin du patient.",                    "TROU"}),
            Map.entry("obstacle on path",         new String[]{"Obstacle sur le chemin",       "Un obstacle bloque le chemin du patient.",                                    "OBSTACLE"}),
            Map.entry("stairs",                   new String[]{"Escaliers détectés",           "Des escaliers ont été détectés devant le patient.",                           "ESCALIER"}),
            Map.entry("safe path",                new String[]{"Chemin libre",                 "Le chemin est libre et sécurisé pour le patient.",                            "AUTRE"}),
            Map.entry("clear road",               new String[]{"Route dégagée",               "La route est dégagée. Aucun danger immédiat.",                                "AUTRE"}),
            Map.entry("door",                     new String[]{"Porte détectée",              "Une porte a été détectée devant le patient.",                                 "AUTRE"}),
            // ── Nouveaux labels accident ──
            Map.entry("car accident",             new String[]{"Accident de voiture détecté",  "Un accident de voiture a été détecté sur le chemin du patient.",              "ACCIDENT"}),
            Map.entry("vehicle crash",            new String[]{"Accident de véhicule",         "Un accident de véhicule a été détecté. Zone dangereuse.",                     "ACCIDENT"}),
            Map.entry("accident scene",           new String[]{"Scène d'accident",             "Une scène d'accident est présente sur le chemin du patient.",                 "ACCIDENT"}),
            Map.entry("fallen person on ground",  new String[]{"Personne tombée au sol",       "Une personne est tombée à terre devant le patient.",                          "CHUTE_PERSONNE"}),
            Map.entry("injured person",           new String[]{"Personne blessée détectée",    "Une personne blessée a été détectée. Secours requis immédiatement.",          "CHUTE_PERSONNE"}),
            Map.entry("road blocked by accident", new String[]{"Route bloquée par accident",   "La route est bloquée suite à un accident. Ne pas avancer.",                   "ACCIDENT"}),
            Map.entry("emergency situation",      new String[]{"Situation d'urgence",          "Une situation d'urgence a été détectée sur le chemin du patient.",            "ZONE_DANGEREUSE"}),
            Map.entry("fire or smoke",            new String[]{"Incendie ou fumée détecté",    "Un feu ou de la fumée a été détecté. Éloignement immédiat nécessaire.",       "INCENDIE"}),
            Map.entry("flooding water on path",   new String[]{"Inondation sur le chemin",     "De l'eau ou une inondation a été détectée sur le chemin du patient.",         "INONDATION"})
    );

    /**
     * Crée un incident depuis le résultat d'analyse CLIP.
     */
    public Incident creerIncident(IncidentRequest req) {
        String label = req.getAiAnalysis() != null ? req.getAiAnalysis() : "unknown";
        String[] info = LABEL_INFO.getOrDefault(label,
            new String[]{"Incident détecté", "Un incident a été détecté par analyse IA.", "ZONE_DANGEREUSE"});

        Incident incident = new Incident();
        incident.setTitle(info[0]);
        incident.setDescription(info[1]);
        incident.setType(IncidentType.valueOf(info[2]));
        incident.setStatus(IncidentStatus.EN_COURS);
        incident.setReporterId(req.getReporterId());
        incident.setPatientId(req.getPatientId());
        incident.setAiAnalysis(label);
        incident.setAiConfidence(req.getAiConfidence());
        incident.setLatitude(req.getLatitude());
        incident.setLongitude(req.getLongitude());
        incident.setMedia(req.getMedia());
        incident.setCreatedAt(LocalDateTime.now());
        incident.setUpdatedAt(LocalDateTime.now());

        return incidentRepository.save(incident);
    }

    /** Tous les incidents (pour ADMIN). */
    public List<Incident> getAll() {
        return incidentRepository.findAllByOrderByCreatedAtDesc();
    }

    /** Incidents d'un patient (pour dashboard patient). */
    public List<Incident> getByPatient(Long patientId) {
        return incidentRepository.findByPatientIdOrderByCreatedAtDesc(patientId);
    }

    /** Marque un incident comme RESOLU. */
    public Incident resoudre(String id) {
        Incident incident = incidentRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Incident non trouvé: " + id));
        incident.setStatus(IncidentStatus.RESOLU);
        incident.setUpdatedAt(LocalDateTime.now());
        return incidentRepository.save(incident);
    }

    /** Marque un incident comme FERME. */
    public Incident fermer(String id) {
        Incident incident = incidentRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Incident non trouvé: " + id));
        incident.setStatus(IncidentStatus.FERME);
        incident.setUpdatedAt(LocalDateTime.now());
        return incidentRepository.save(incident);
    }
}
