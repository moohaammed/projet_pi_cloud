package esprit.tn.donation.repository;

import esprit.tn.donation.entity.DonationCampaign;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DonationCampaignRepository extends MongoRepository<DonationCampaign, String> {
    List<DonationCampaign> findByActiveTrue();
}
