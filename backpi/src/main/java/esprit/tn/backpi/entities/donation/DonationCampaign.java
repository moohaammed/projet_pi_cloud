package esprit.tn.backpi.entities.donation;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "donation_campaigns")
public class DonationCampaign {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private Double goalAmount;

    private Double currentAmount = 0.0;

    private String imageUrl;

    private Boolean active = true;

    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        if (this.currentAmount == null) this.currentAmount = 0.0;
        if (this.active == null) this.active = true;
    }

    // ── Getters / Setters ──────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

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
