package esprit.tn.backpi.repository;

import esprit.tn.backpi.entity.Hospital;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HospitalRepository extends JpaRepository<Hospital, Long> {
}