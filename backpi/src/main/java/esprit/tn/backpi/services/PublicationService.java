package esprit.tn.backpi.services;

import esprit.tn.backpi.entities.Publication;
import esprit.tn.backpi.repositories.PublicationRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PublicationService {

    private final PublicationRepository publicationRepository;
    private final SentimentAnalysisService sentimentAnalysisService;

    public PublicationService(PublicationRepository publicationRepository, SentimentAnalysisService sentimentAnalysisService) {
        this.publicationRepository = publicationRepository;
        this.sentimentAnalysisService = sentimentAnalysisService;
    }

    public List<Publication> getAllPublications() {
        return publicationRepository.findAll();
    }

    public Publication getPublicationById(Long id) {
        return publicationRepository.findById(id).orElse(null);
    }

    public Publication createPublication(Publication publication) {
        boolean isWorrying = sentimentAnalysisService.isWorryingContent(publication.getContent());
        publication.setDistressed(isWorrying);
        System.out.println("DEBUG [PublicationService]: Saving publication. Distressed: " + isWorrying);
        return publicationRepository.save(publication);
    }

    public Publication updatePublication(Long id, Publication updatedPublication) {
        return publicationRepository.findById(id).map(existingPublication -> {
            existingPublication.setContent(updatedPublication.getContent());
            existingPublication.setMediaUrl(updatedPublication.getMediaUrl());
            // Optionally update other fields
            return publicationRepository.save(existingPublication);
        }).orElse(null);
    }

    public void deletePublication(Long id) {
        publicationRepository.deleteById(id);
    }
}
