package esprit.tn.backpi.service;

import esprit.tn.backpi.entity.SafeZone;
import esprit.tn.backpi.entity.User;
import esprit.tn.backpi.repository.SafeZoneRepository;
import esprit.tn.backpi.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class SafeZoneService {

    @Autowired private SafeZoneRepository safeZoneRepository;
    @Autowired private UserRepository userRepository;

    public List<SafeZone> getByPatient(Long patientId) {
        return safeZoneRepository.findByPatient_Id(patientId);
    }

    public SafeZone create(SafeZone zone, Long patientId, Long doctorId) {
        User patient = userRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient non trouvé"));
        User doctor = userRepository.findById(doctorId)
                .orElseThrow(() -> new RuntimeException("Médecin non trouvé"));
        zone.setPatient(patient);
        zone.setDoctor(doctor);
        zone.setUpdatedAt(LocalDateTime.now());
        return safeZoneRepository.save(zone);
    }

    public SafeZone update(Long id, SafeZone zoneDetails) {
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

    public void delete(Long id) {
        safeZoneRepository.deleteById(id);
    }
}
