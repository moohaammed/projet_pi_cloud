package esprit.tn.backpi.controllers.collaboration;

import esprit.tn.backpi.dto.collaboration.ChatGroupCreateDto;
import esprit.tn.backpi.dto.collaboration.ChatGroupResponseDto;
import esprit.tn.backpi.entities.collaboration.GroupJoinRequest;
import esprit.tn.backpi.services.collaboration.ChatGroupService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups")
@CrossOrigin(origins = "http://localhost:4200")
public class ChatGroupController {

    private final ChatGroupService chatGroupService;

    public ChatGroupController(ChatGroupService chatGroupService) {
        this.chatGroupService = chatGroupService;
    }

    @GetMapping
    public List<ChatGroupResponseDto> getAllGroups() {
        return chatGroupService.getAllGroups();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ChatGroupResponseDto> getGroupById(@PathVariable("id") Long id) {
        ChatGroupResponseDto group = chatGroupService.getGroupById(id);
        return group != null ? ResponseEntity.ok(group) : ResponseEntity.notFound().build();
    }

    @PostMapping
    public ChatGroupResponseDto createGroup(@Valid @RequestBody ChatGroupCreateDto dto) {
        return chatGroupService.createGroup(dto);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ChatGroupResponseDto> updateGroup(@PathVariable("id") Long id, @Valid @RequestBody ChatGroupCreateDto dto) {
        ChatGroupResponseDto group = chatGroupService.updateGroup(id, dto);
        return group != null ? ResponseEntity.ok(group) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGroup(@PathVariable("id") Long id) {
        chatGroupService.deleteGroup(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{groupId}/join/{userId}")
    public ResponseEntity<ChatGroupResponseDto> joinGroup(@PathVariable("groupId") Long groupId, @PathVariable("userId") Long userId) {
        ChatGroupResponseDto group = chatGroupService.joinGroup(groupId, userId);
        return group != null ? ResponseEntity.ok(group) : ResponseEntity.notFound().build();
    }

    @PostMapping("/{groupId}/leave/{userId}")
    public ResponseEntity<ChatGroupResponseDto> leaveGroup(@PathVariable("groupId") Long groupId, @PathVariable("userId") Long userId) {
        ChatGroupResponseDto group = chatGroupService.leaveGroup(groupId, userId);
        return group != null ? ResponseEntity.ok(group) : ResponseEntity.notFound().build();
    }

    @PostMapping("/{groupId}/request-join/{userId}")
    public ResponseEntity<Void> requestJoin(@PathVariable("groupId") Long groupId, @PathVariable("userId") Long userId) {
        chatGroupService.requestToJoinGroup(groupId, userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/requests/{requestId}/approve")
    public ResponseEntity<Void> approveRequest(@PathVariable("requestId") Long requestId) {
        chatGroupService.approveJoinRequest(requestId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/requests/{requestId}/reject")
    public ResponseEntity<Void> rejectRequest(@PathVariable("requestId") Long requestId) {
        chatGroupService.rejectJoinRequest(requestId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/owner/{ownerId}/pending-requests")
    public List<GroupJoinRequest> getPendingRequests(@PathVariable("ownerId") Long ownerId) {
        return chatGroupService.getPendingRequestsForOwner(ownerId);
    }
}
