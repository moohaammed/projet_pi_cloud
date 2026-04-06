package esprit.tn.backpi.repositories.donation;

import esprit.tn.backpi.entities.donation.Donation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface DonationRepository extends JpaRepository<Donation, Long> {
    List<Donation> findByCampaignId(Long campaignId);
    List<Donation> findByUserId(Long userId);
    List<Donation> findByDonorEmail(String donorEmail);
    
    Donation findByStripeSessionId(String stripeSessionId);

    @Query("SELECT COALESCE(SUM(d.amount), 0) FROM Donation d WHERE d.campaignId = :campaignId AND d.status = 'COMPLETED'")
    Double sumAmountByCampaignId(@Param("campaignId") Long campaignId);
}
