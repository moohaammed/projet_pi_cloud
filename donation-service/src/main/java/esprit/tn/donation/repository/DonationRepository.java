package esprit.tn.donation.repository;

import esprit.tn.donation.entity.Donation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DonationRepository extends MongoRepository<Donation, String> {
    List<Donation> findByCampaignId(String campaignId);
    List<Donation> findByCampaignIdAndStatus(String campaignId, String status);
    List<Donation> findByUserId(Long userId);
    List<Donation> findByDonorEmail(String email);
    Optional<Donation> findByStripeSessionId(String stripeSessionId);
}
