package esprit.tn.collab.repositories.collaboration;

import esprit.tn.collab.entities.collaboration.GroupJoinRequest;
import esprit.tn.collab.entities.collaboration.JoinRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface GroupJoinRequestRepository extends JpaRepository<GroupJoinRequest, Long> {
    List<GroupJoinRequest> findByGroupIdAndStatus(Long groupId, JoinRequestStatus status);

    @Query("SELECT r FROM GroupJoinRequest r WHERE r.group.ownerId = :ownerId AND r.status = :status")
    List<GroupJoinRequest> findByGroupOwnerIdAndStatus(@Param("ownerId") Long ownerId, @Param("status") JoinRequestStatus status);

    boolean existsByGroupIdAndUserIdAndStatus(Long groupId, Long userId, JoinRequestStatus status);
}
