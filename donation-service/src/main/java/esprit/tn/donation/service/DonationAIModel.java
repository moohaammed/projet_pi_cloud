package esprit.tn.donation.service;

import org.springframework.stereotype.Component;
import java.util.*;
import java.util.regex.Pattern;

/**
 * Modèle d'IA Local "Coded" pour l'Analyse de Campagnes de Dons.
 * Utilise des algorithmes sémantiques et probabilistes pour la classification
 * et la génération de texte émotionnel.
 */
@Component
public class DonationAIModel {

    // Clusters de mots-clés par catégorie
    private final Map<String, List<String>> categoryClusters = Map.of(
        "Santé & Médical", List.of("médicament", "soin", "hôpital", "chirurgie", "malade", "santé", "traitement", "médecin", "vaccin", "opération"),
        "Éducation", List.of("école", "élève", "étudiant", "livre", "fourniture", "classe", "apprendre", "formation", "instruction", "scolaire"),
        "Aide Humanitaire", List.of("nourriture", "famine", "alimentaire", "vêtement", "abri", "réfugié", "urgence", "séisme", "catastrophe", "secours"),
        "Accessibilité & Handicap", List.of("handicap", "fauteuil", "mobilité", "inclusive", "accessibilité", "aveugle", "prothèse", "besoins"),
        "Environnement & Eau", List.of("eau", "puits", "écologie", "nature", "potable", "environnement", "climat", "hygiène", "assainissement")
    );

    // Mots-clés indicateurs d'urgence
    private final List<String> highUrgencyKeywords = List.of("critique", "immédiat", "vital", "dernier moment", "urgent", "survie", "agonie", "grave", "dès maintenant");
    private final List<String> mediumUrgencyKeywords = List.of("besoin", "important", "nécessaire", "soutenir", "aidez-nous", "rapidement", "difficulté");

    public Map<String, String> analyze(String description) {
        if (description == null) description = "";
        String lowerDesc = description.toLowerCase();

        String category = detectCategory(lowerDesc);
        String urgency = detectUrgency(lowerDesc);
        String beneficiaries = detectBeneficiaries(lowerDesc);
        String pitch = generatePitch(description, category);

        Map<String, String> result = new HashMap<>();
        result.put("category", category);
        result.put("urgency", urgency);
        result.put("beneficiaries", beneficiaries);
        result.put("pitch", pitch);
        result.put("region", "Afrique / Monde"); // Par défaut, ou détection si besoin
        
        return result;
    }

    private String detectCategory(String text) {
        String bestCategory = "Social / Autres";
        int maxScore = 0;

        for (Map.Entry<String, List<String>> entry : categoryClusters.entrySet()) {
            int score = 0;
            for (String kw : entry.getValue()) {
                if (text.contains(kw)) score++;
            }
            if (score > maxScore) {
                maxScore = score;
                bestCategory = entry.getKey();
            }
        }
        return bestCategory;
    }

    private String detectUrgency(String text) {
        for (String kw : highUrgencyKeywords) {
            if (text.contains(kw)) return "Haute";
        }
        for (String kw : mediumUrgencyKeywords) {
            if (text.contains(kw)) return "Moyenne";
        }
        return "Basse";
    }

    private String detectBeneficiaries(String text) {
        if (text.contains("enfant") || text.contains("orphelin")) return "Enfants & Orphelins";
        if (text.contains("femme") || text.contains("mère")) return "Femmes et Familles";
        if (text.contains("étudiant") || text.contains("élève")) return "Étudiants";
        if (text.contains("village") || text.contains("habitant")) return "Communauté villageoise";
        return "Personnes démunies";
    }

    private String generatePitch(String description, String category) {
        // Logique de génération de pitch "émotionnel" par templates NLP
        String[] intros = {
            "Chaque geste compte.",
            "Ensemble, nous pouvons changer une vie.",
            "Votre générosité est leur seul espoir.",
            "Un petit don, un grand impact."
        };
        
        String[] corePhrases = {
            "Imaginez l'impact de votre soutien sur cette cause.",
            "Cette campagne de " + category + " a besoin de vous aujourd'hui.",
            "Ne restons pas indifférents face à cette situation."
        };

        Random rand = new Random();
        String intro = intros[rand.nextInt(intros.length)];
        String core = corePhrases[rand.nextInt(corePhrases.length)];

        // On essaie d'extraire une bribe de la description pour personnaliser
        String snippet = description.length() > 60 ? description.substring(0, 57) + "..." : description;

        return intro + " " + snippet + ". " + core + " Transformez votre compassion en action dès maintenant.";
    }
}
