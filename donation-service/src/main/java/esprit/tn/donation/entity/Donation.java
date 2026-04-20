package esprit.tn.donation.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "donations")
public class Donation {

    @Id
    private String id;

    private Double amount;

    private String donorFirstName;

    private String donorLastName;

    private String donorEmail;

    private String donorPhone;

    private String paymentMethod; // ONLINE or OFFLINE

    private Boolean anonymous = false;

    private String message;

    private String campaignId; // FK vers DonationCampaign

    private Long userId; // FK nullable vers User (si connecté - keep as Long since User DB uses Long)
    
    private String stripeSessionId; // Pour le tracking Stripe
    
    private String status = "PENDING"; // PENDING, COMPLETED, FAILED

    private LocalDateTime createdAt;

    public Donation() {
        this.createdAt = LocalDateTime.now();
        if (this.anonymous == null) this.anonymous = false;
        if (this.status == null) this.status = "PENDING";
    }

    // ── Getters / Setters ──────────────────────────────────

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public String getDonorFirstName() { return donorFirstName; }
    public void setDonorFirstName(String donorFirstName) { this.donorFirstName = donorFirstName; }

    public String getDonorLastName() { return donorLastName; }
    public void setDonorLastName(String donorLastName) { this.donorLastName = donorLastName; }

    public String getDonorEmail() { return donorEmail; }
    public void setDonorEmail(String donorEmail) { this.donorEmail = donorEmail; }

    public String getDonorPhone() { return donorPhone; }
    public void setDonorPhone(String donorPhone) { this.donorPhone = donorPhone; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public Boolean getAnonymous() { return anonymous; }
    public void setAnonymous(Boolean anonymous) { this.anonymous = anonymous; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getCampaignId() { return campaignId; }
    public void setCampaignId(String campaignId) { this.campaignId = campaignId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getStripeSessionId() { return stripeSessionId; }
    public void setStripeSessionId(String stripeSessionId) { this.stripeSessionId = stripeSessionId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
