package esprit.tn.donation.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "donation_campaigns")
public class DonationCampaign {

    @Id
    private String id;

    private String title;

    private String description;

    private Double goalAmount;

    private Double currentAmount = 0.0;

    private String imageUrl;

    private Boolean active = true;

    private LocalDateTime createdAt;

    public DonationCampaign() {
        this.createdAt = LocalDateTime.now();
        if (this.currentAmount == null) this.currentAmount = 0.0;
        if (this.active == null) this.active = true;
    }

    // ── Getters / Setters ──────────────────────────────────

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Double getGoalAmount() { return goalAmount; }
    public void setGoalAmount(Double goalAmount) { this.goalAmount = goalAmount; }

    public Double getCurrentAmount() { return currentAmount; }
    public void setCurrentAmount(Double currentAmount) { this.currentAmount = currentAmount; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
