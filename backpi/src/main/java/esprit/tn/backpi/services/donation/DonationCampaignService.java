package esprit.tn.backpi.services.donation;

import esprit.tn.backpi.entities.donation.DonationCampaign;
import esprit.tn.backpi.repositories.donation.DonationCampaignRepository;
import esprit.tn.backpi.repositories.donation.DonationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DonationCampaignService {

    @Autowired
    private DonationCampaignRepository campaignRepository;

    @Autowired
    private DonationRepository donationRepository;

    // CREATE
    public DonationCampaign createCampaign(DonationCampaign campaign) {
        return campaignRepository.save(campaign);
    }

    // READ ALL
    public List<DonationCampaign> getAllCampaigns() {
        return campaignRepository.findAll();
    }

    // READ ACTIVE ONLY
    public List<DonationCampaign> getActiveCampaigns() {
        return campaignRepository.findByActiveTrue();
    }

    // READ BY ID
    public DonationCampaign getCampaignById(Long id) {
        return campaignRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Campaign non trouvée : " + id));
    }

    // UPDATE
    public DonationCampaign updateCampaign(Long id, DonationCampaign updated) {
        DonationCampaign existing = getCampaignById(id);

        existing.setTitle(updated.getTitle());
        existing.setDescription(updated.getDescription());
        existing.setGoalAmount(updated.getGoalAmount());
        existing.setActive(updated.getActive());

        // Ne pas écraser imageUrl si elle n'est pas fournie
        if (updated.getImageUrl() != null) {
            existing.setImageUrl(updated.getImageUrl());
        }

        return campaignRepository.save(existing);
    }

    // DELETE
    public void deleteCampaign(Long id) {
        campaignRepository.deleteById(id);
    }

    // RECALCULATE current amount from donations
    public void refreshCurrentAmount(Long campaignId) {
        DonationCampaign campaign = getCampaignById(campaignId);
        Double total = donationRepository.sumAmountByCampaignId(campaignId);
        campaign.setCurrentAmount(total != null ? total : 0.0);
        campaignRepository.save(campaign);
    }
}
