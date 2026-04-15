package esprit.tn.backpi.repository;

import esprit.tn.backpi.entity.SafeZone;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SafeZoneRepository extends JpaRepository<SafeZone, Long> {
    List<SafeZone> findByPatient_Id(Long patientId);
    List<SafeZone> findByDoctor_Id(Long doctorId);
    List<SafeZone> findByPatient_IdAndActifTrue(Long patientId);
}

