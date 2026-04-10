package esprit.tn.collab.repositories.collaboration;

import esprit.tn.collab.entities.collaboration.GroupJoinRequest;
import esprit.tn.collab.entities.collaboration.JoinRequestStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface GroupJoinRequestRepository extends MongoRepository<GroupJoinRequest, String> {
    List<GroupJoinRequest> findByGroupIdAndStatus(String groupId, JoinRequestStatus status);
    List<GroupJoinRequest> findByGroupOwnerIdAndStatus(Long ownerId, JoinRequestStatus status);
    boolean existsByGroupIdAndUserIdAndStatus(String groupId, Long userId, JoinRequestStatus status);
}
