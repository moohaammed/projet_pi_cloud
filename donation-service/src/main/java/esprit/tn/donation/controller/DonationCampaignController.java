package esprit.tn.donation.controller;

import esprit.tn.donation.entity.DonationCampaign;
import esprit.tn.donation.service.DonationCampaignService;
import esprit.tn.donation.service.FileStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/campaigns")
@CrossOrigin(origins = "http://localhost:4200")
public class DonationCampaignController {

    @Autowired
    private DonationCampaignService campaignService;

    @Autowired
    private FileStorageService fileStorageService;

    // GET /api/campaigns
    @GetMapping
    public List<DonationCampaign> getAll() {
        return campaignService.getAllCampaigns();
    }

    // GET /api/campaigns/active
    @GetMapping("/active")
    public List<DonationCampaign> getActive() {
        return campaignService.getActiveCampaigns();
    }

    // GET /api/campaigns/{id}
    @GetMapping("/{id}")
    public ResponseEntity<DonationCampaign> getById(@PathVariable String id) {
        return ResponseEntity.ok(campaignService.getCampaignById(id));
    }

    // POST /api/campaigns
    @PostMapping
    public ResponseEntity<DonationCampaign> create(@RequestBody DonationCampaign campaign) {
        return ResponseEntity.ok(campaignService.createCampaign(campaign));
    }

    // PUT /api/campaigns/{id}
    @PutMapping("/{id}")
    public ResponseEntity<DonationCampaign> update(@PathVariable String id, @RequestBody DonationCampaign campaign) {
        return ResponseEntity.ok(campaignService.updateCampaign(id, campaign));
    }

    // DELETE /api/campaigns/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        campaignService.deleteCampaign(id);
        return ResponseEntity.noContent().build();
    }

    // POST /api/campaigns/{id}/image
    @PostMapping("/{id}/image")
    public ResponseEntity<DonationCampaign> uploadImage(@PathVariable String id, @RequestParam("file") MultipartFile file) {
        DonationCampaign campaign = campaignService.getCampaignById(id);
        String imageUrl = fileStorageService.storeFile(file);
        campaign.setImageUrl(imageUrl);
        DonationCampaign saved = campaignService.updateCampaign(id, campaign);
        return ResponseEntity.ok(saved);
    }
}
