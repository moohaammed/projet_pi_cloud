package tn.esprit.smartwatchservice.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import tn.esprit.smartwatchservice.entity.HeartRateRecord;

import java.util.List;
import java.util.Optional;

@Repository
public interface HeartRateRepository extends MongoRepository<HeartRateRecord, String> {

    /**
     * Find the most recent heart-rate record for a given user.
     */
    Optional<HeartRateRecord> findTopByUserIdOrderByRecordedAtDesc(Long userId);

    /**
     * Find all heart-rate records for a given user, ordered by most recent first.
     */
    List<HeartRateRecord> findByUserIdOrderByRecordedAtDesc(Long userId);
}
