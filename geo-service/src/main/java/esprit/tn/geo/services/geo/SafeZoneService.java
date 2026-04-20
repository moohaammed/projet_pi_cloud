package esprit.tn.geo.services.geo;

import esprit.tn.geo.entities.geo.SafeZone;
import esprit.tn.geo.repositories.geo.SafeZoneRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class SafeZoneService {

    @Autowired
    private SafeZoneRepository safeZoneRepository;

    public List<SafeZone> getByPatient(Long patientId) {
        return safeZoneRepository.findByPatientId(patientId);
    }

    /**
     * Crée une nouvelle SafeZone.
     * patientId et doctorId sont passés directement (IDs depuis backpi).
     */
    public SafeZone create(SafeZone zone, Long patientId, Long doctorId) {
        zone.setPatientId(patientId);
        zone.setDoctorId(doctorId);
        zone.setUpdatedAt(LocalDateTime.now());
        return safeZoneRepository.save(zone);
    }

    public SafeZone update(String id, SafeZone zoneDetails) {
        SafeZone zone = safeZoneRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Zone non trouvée"));
        zone.setNom(zoneDetails.getNom());
        zone.setLatitudeCentre(zoneDetails.getLatitudeCentre());
        zone.setLongitudeCentre(zoneDetails.getLongitudeCentre());
        zone.setRayonVert(zoneDetails.getRayonVert());
        zone.setRayonRouge(zoneDetails.getRayonRouge());
        zone.setActif(zoneDetails.isActif());
        zone.setUpdatedAt(LocalDateTime.now());
        return safeZoneRepository.save(zone);
    }

    public void delete(String id) {
        safeZoneRepository.deleteById(id);
    }
}
