package esprit.tn.collab.controllers.collaboration;

import esprit.tn.collab.dto.collaboration.ChatGroupCreateDto;
import esprit.tn.collab.dto.collaboration.ChatGroupResponseDto;
import esprit.tn.collab.entities.collaboration.GroupJoinRequest;
import esprit.tn.collab.services.collaboration.ChatGroupService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups")
@CrossOrigin(origins = "http://localhost:4200")
public class ChatGroupController {

    private final ChatGroupService chatGroupService;

    public ChatGroupController(ChatGroupService chatGroupService) { this.chatGroupService = chatGroupService; }

    @GetMapping
    public List<ChatGroupResponseDto> getAllGroups() { return chatGroupService.getAllGroups(); }

    @GetMapping("/{id}")
    public ResponseEntity<ChatGroupResponseDto> getGroupById(@PathVariable String id) {
        ChatGroupResponseDto g = chatGroupService.getGroupById(id);
        return g != null ? ResponseEntity.ok(g) : ResponseEntity.notFound().build();
    }

    @PostMapping
    public ChatGroupResponseDto createGroup(@Valid @RequestBody ChatGroupCreateDto dto) {
        return chatGroupService.createGroup(dto);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ChatGroupResponseDto> updateGroup(@PathVariable String id, @Valid @RequestBody ChatGroupCreateDto dto) {
        ChatGroupResponseDto g = chatGroupService.updateGroup(id, dto);
        return g != null ? ResponseEntity.ok(g) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGroup(@PathVariable String id) {
        chatGroupService.deleteGroup(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{groupId}/join/{userId}")
    public ResponseEntity<ChatGroupResponseDto> joinGroup(@PathVariable String groupId, @PathVariable Long userId) {
        ChatGroupResponseDto g = chatGroupService.joinGroup(groupId, userId);
        return g != null ? ResponseEntity.ok(g) : ResponseEntity.notFound().build();
    }

    @PostMapping("/{groupId}/leave/{userId}")
    public ResponseEntity<ChatGroupResponseDto> leaveGroup(@PathVariable String groupId, @PathVariable Long userId) {
        ChatGroupResponseDto g = chatGroupService.leaveGroup(groupId, userId);
        return g != null ? ResponseEntity.ok(g) : ResponseEntity.notFound().build();
    }

    @PostMapping("/{groupId}/request-join/{userId}")
    public ResponseEntity<Void> requestJoin(@PathVariable String groupId, @PathVariable Long userId) {
        chatGroupService.requestToJoinGroup(groupId, userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/requests/{requestId}/approve")
    public ResponseEntity<Void> approveRequest(@PathVariable String requestId) {
        chatGroupService.approveJoinRequest(requestId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/requests/{requestId}/reject")
    public ResponseEntity<Void> rejectRequest(@PathVariable String requestId) {
        chatGroupService.rejectJoinRequest(requestId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/owner/{ownerId}/pending-requests")
    public List<GroupJoinRequest> getPendingRequests(@PathVariable Long ownerId) {
        return chatGroupService.getPendingRequestsForOwner(ownerId);
    }
}
