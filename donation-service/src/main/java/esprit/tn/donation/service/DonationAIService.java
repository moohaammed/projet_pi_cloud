package esprit.tn.donation.service;

import esprit.tn.donation.entity.DonationCampaign;
import esprit.tn.donation.repository.DonationCampaignRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class DonationAIService {

    @Autowired
    private OllamaService ollamaService;

    @Autowired
    private DonationCampaignRepository campaignRepository;

    public Map<String, Object> analyzeCampaign(DonationCampaign campaign) throws Exception {
        // 1. Exécution de Llama 3 via Ollama
        String summary = ollamaService.generateDonationSummary(
                campaign.getTitle(),
                campaign.getDescription(),
                campaign.getGoalAmount() != null ? campaign.getGoalAmount().intValue() : 0
        );
        
        // 2. Persistance du résumé dans la base de données
        campaign.setAiSummary(summary);
        campaignRepository.save(campaign);
        
        // 3. Préparation du résultat pour le frontend
        Map<String, Object> result = new HashMap<>();
        result.put("pitch", summary);
        result.put("aiSummary", summary);
        result.put("category", "Santé / Alzheimer"); 
        result.put("urgency", "Moyenne"); // On pourrait aussi demander à Llama 3 d'extraire ça
        
        return result;
    }
}
