package esprit.tn.donation.controller;

import esprit.tn.donation.entity.DonationCampaign;
import esprit.tn.donation.service.DonationAIService;
import esprit.tn.donation.service.DonationCampaignService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "http://localhost:4200")
public class DonationAIController {

    @Autowired
    private DonationAIService aiService;

    @Autowired
    private DonationCampaignService campaignService;

    @GetMapping("/analyze-campaign/{id}")
    public ResponseEntity<Map<String, Object>> analyzeCampaign(@PathVariable String id) {
        try {
            DonationCampaign campaign = campaignService.getCampaignById(id);
            if (campaign == null) {
                return ResponseEntity.notFound().build();
            }
            Map<String, Object> analysis = aiService.analyzeCampaign(campaign);
            return ResponseEntity.ok(analysis);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
}
