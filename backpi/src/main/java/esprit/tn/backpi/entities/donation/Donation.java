package esprit.tn.backpi.entities.donation;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "donations")
public class Donation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Double amount;

    @Column(nullable = false)
    private String donorFirstName;

    @Column(nullable = false)
    private String donorLastName;

    @Column(nullable = false)
    private String donorEmail;

    private String donorPhone;

    private String paymentMethod; // ONLINE or OFFLINE

    private Boolean anonymous = false;

    @Column(length = 500)
    private String message;

    private Long campaignId; // FK vers DonationCampaign

    private Long userId; // FK nullable vers User (si connecté)
    
    private String stripeSessionId; // Pour le tracking Stripe
    
    private String status = "PENDING"; // PENDING, COMPLETED, FAILED

    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        if (this.anonymous == null) this.anonymous = false;
        if (this.status == null) this.status = "PENDING";
    }

    // ── Getters / Setters ──────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

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

    public Long getCampaignId() { return campaignId; }
    public void setCampaignId(Long campaignId) { this.campaignId = campaignId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getStripeSessionId() { return stripeSessionId; }
    public void setStripeSessionId(String stripeSessionId) { this.stripeSessionId = stripeSessionId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
