package esprit.tn.donation.controller;

import esprit.tn.donation.entity.Donation;
import esprit.tn.donation.service.DonationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.stripe.Stripe;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;

import jakarta.annotation.PostConstruct;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/donations")
@CrossOrigin(origins = "http://localhost:4200")
public class DonationController {

    @Autowired
    private DonationService donationService;

    @Value("${stripe.api.key}")
    private String stripeApiKey;

    @Value("${frontend.url}")
    private String frontendUrl;

    @PostConstruct
    public void initStripe() {
        Stripe.apiKey = stripeApiKey;
    }

    // GET /api/donations
    @GetMapping
    public List<Donation> getAll() {
        return donationService.getAllDonations();
    }

    // GET /api/donations/{id}
    @GetMapping("/{id}")
    public ResponseEntity<Donation> getById(@PathVariable String id) {
        return ResponseEntity.ok(donationService.getDonationById(id));
    }

    // GET /api/donations/campaign/{campaignId}
    @GetMapping("/campaign/{campaignId}")
    public List<Donation> getByCampaign(@PathVariable String campaignId) {
        return donationService.getDonationsByCampaign(campaignId);
    }

    // GET /api/donations/user/{userId}
    @GetMapping("/user/{userId}")
    public List<Donation> getByUser(@PathVariable Long userId) {
        return donationService.getDonationsByUser(userId);
    }

    // GET /api/donations/email/{email}
    @GetMapping("/email/{email}")
    public List<Donation> getByEmail(@PathVariable String email) {
        return donationService.getDonationsByEmail(email);
    }

    // POST /api/donations (Offline)
    @PostMapping
    public ResponseEntity<Donation> create(@RequestBody Donation donation) {
        return ResponseEntity.ok(donationService.createDonation(donation));
    }

    // POST /api/donations/checkout (Online)
    @PostMapping(value = "/checkout", produces = "application/json")
    public ResponseEntity<CheckoutResponse> createCheckoutSession(@RequestBody Donation donation) throws Exception {
        // Save pending donation
        donation.setStatus("PENDING");
        donation.setPaymentMethod("ONLINE");
        Donation savedDonation = donationService.createDonation(donation);

        // Stripe checkout requires a currency supported by the Stripe account.
        long amountInCents = (long) (savedDonation.getAmount() * 100);

        SessionCreateParams params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setSuccessUrl(frontendUrl + "/donations/success?session_id={CHECKOUT_SESSION_ID}")
                .setCancelUrl(frontendUrl + "/donations/cancel")
                .addLineItem(SessionCreateParams.LineItem.builder()
                        .setQuantity(1L)
                        .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                                .setCurrency("usd")
                                .setUnitAmount(amountInCents)
                                .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                        .setName("Donation pour Campagne ID: " + savedDonation.getCampaignId())
                                        .build())
                                .build())
                        .build())
                .build();

        Session session = Session.create(params);

        // Update donation with stripe session id
        savedDonation.setStripeSessionId(session.getId());
        donationService.createDonation(savedDonation);

        return ResponseEntity.ok(new CheckoutResponse(session.getId(), session.getUrl()));
    }

    // Static DTO inside the controller to guarantee clean JSON serialization
    public static class CheckoutResponse {
        private String sessionId;
        private String url;

        public CheckoutResponse() {}

        public CheckoutResponse(String sessionId, String url) {
            this.sessionId = sessionId;
            this.url = url;
        }

        public String getSessionId() { return sessionId; }
        public void setSessionId(String sessionId) { this.sessionId = sessionId; }

        public String getUrl() { return url; }
        public void setUrl(String url) { this.url = url; }
    }

    // POST /api/donations/verify
    @PostMapping("/verify")
    public ResponseEntity<Donation> verifyCheckoutSession(@RequestBody Map<String, String> payload) {
        String sessionId = payload.get("sessionId");
        Donation updated = donationService.completeStripeDonation(sessionId);
        
        if (updated == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(updated);
    }

    // DELETE /api/donations/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        donationService.deleteDonation(id);
        return ResponseEntity.noContent().build();
    }
}
