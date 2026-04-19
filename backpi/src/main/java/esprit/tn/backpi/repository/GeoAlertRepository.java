package esprit.tn.backpi.repository;


import esprit.tn.backpi.entity.GeoAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface GeoAlertRepository extends JpaRepository<GeoAlert, Long> {
    List<GeoAlert> findByPatient_IdOrderByDeclencheeAtDesc(Long patientId);
    List<GeoAlert> findByResolue(boolean resolue);
    List<GeoAlert> findByPatient_IdAndResolue(Long patientId, boolean resolue);
}
