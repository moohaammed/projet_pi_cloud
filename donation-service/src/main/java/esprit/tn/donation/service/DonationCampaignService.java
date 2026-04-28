package esprit.tn.donation.service;

import esprit.tn.donation.entity.Donation;
import esprit.tn.donation.entity.DonationCampaign;
import esprit.tn.donation.repository.DonationCampaignRepository;
import esprit.tn.donation.repository.DonationRepository;
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
    public DonationCampaign getCampaignById(String id) {
        return campaignRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Campaign non trouvée : " + id));
    }

    public DonationCampaign saveCampaign(DonationCampaign campaign) {
        return campaignRepository.save(campaign);
    }

    // UPDATE
    public DonationCampaign updateCampaign(String id, DonationCampaign updated) {
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
    public void deleteCampaign(String id) {
        campaignRepository.deleteById(id);
    }

    // RECALCULATE current amount from donations
    public void refreshCurrentAmount(String campaignId) {
        DonationCampaign campaign = getCampaignById(campaignId);
        List<Donation> completedDonations = donationRepository.findByCampaignIdAndStatus(campaignId, "COMPLETED");
        Double total = completedDonations.stream().mapToDouble(d -> d.getAmount() != null ? d.getAmount() : 0.0).sum();
        campaign.setCurrentAmount(total);
        campaignRepository.save(campaign);
    }
}
