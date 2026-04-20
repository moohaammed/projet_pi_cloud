package esprit.tn.donation.service;

import esprit.tn.donation.entity.Donation;
import esprit.tn.donation.repository.DonationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DonationService {

    @Autowired
    private DonationRepository donationRepository;

    @Autowired
    private DonationCampaignService campaignService;

    // CREATE — also refreshes campaign total (only if offline, else handled by verify)
    public Donation createDonation(Donation donation) {
        if ("OFFLINE".equalsIgnoreCase(donation.getPaymentMethod())) {
            donation.setStatus("COMPLETED");
        }
        Donation saved = donationRepository.save(donation);
        if (saved.getCampaignId() != null && "COMPLETED".equals(saved.getStatus())) {
            campaignService.refreshCurrentAmount(saved.getCampaignId());
        }
        return saved;
    }

    // UPDATE STATUS FROM STRIPE
    public Donation completeStripeDonation(String sessionId) {
        Donation donation = donationRepository.findByStripeSessionId(sessionId).orElse(null);
        if (donation != null && !"COMPLETED".equals(donation.getStatus())) {
            donation.setStatus("COMPLETED");
            donationRepository.save(donation);
            if (donation.getCampaignId() != null) {
                campaignService.refreshCurrentAmount(donation.getCampaignId());
            }
        }
        return donation;
    }

    // READ ALL
    public List<Donation> getAllDonations() {
        return donationRepository.findAll();
    }

    // READ BY ID
    public Donation getDonationById(String id) {
        return donationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Donation non trouvée : " + id));
    }

    // READ BY CAMPAIGN
    public List<Donation> getDonationsByCampaign(String campaignId) {
        return donationRepository.findByCampaignId(campaignId);
    }

    // READ BY USER
    public List<Donation> getDonationsByUser(Long userId) {
        return donationRepository.findByUserId(userId);
    }

    // READ BY EMAIL
    public List<Donation> getDonationsByEmail(String email) {
        return donationRepository.findByDonorEmail(email);
    }

    // DELETE — also refreshes campaign total
    public void deleteDonation(String id) {
        Donation donation = getDonationById(id);
        String campaignId = donation.getCampaignId();
        String status = donation.getStatus();
        donationRepository.deleteById(id);
        if (campaignId != null && "COMPLETED".equals(status)) {
            campaignService.refreshCurrentAmount(campaignId);
        }
    }
}
