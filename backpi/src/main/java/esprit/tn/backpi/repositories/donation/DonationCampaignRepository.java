package esprit.tn.backpi.repositories.donation;

import esprit.tn.backpi.entities.donation.DonationCampaign;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DonationCampaignRepository extends JpaRepository<DonationCampaign, Long> {
    List<DonationCampaign> findByActiveTrue();
}
