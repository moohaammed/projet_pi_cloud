package esprit.tn.backpi.repositories.collaboration;

import esprit.tn.backpi.entities.collaboration.GroupJoinRequest;
import esprit.tn.backpi.entities.collaboration.JoinRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface GroupJoinRequestRepository extends JpaRepository<GroupJoinRequest, Long> {
    List<GroupJoinRequest> findByGroupIdAndStatus(Long groupId, JoinRequestStatus status);
    List<GroupJoinRequest> findByGroupOwnerIdAndStatus(Long ownerId, JoinRequestStatus status);
    boolean existsByGroupIdAndUserIdAndStatus(Long groupId, Long userId, JoinRequestStatus status);
}
