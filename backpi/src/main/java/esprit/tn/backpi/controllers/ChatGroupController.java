package esprit.tn.backpi.controllers;

import esprit.tn.backpi.entities.ChatGroup;
import esprit.tn.backpi.services.ChatGroupService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
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
    public List<ChatGroup> getAllGroups() {
        return chatGroupService.getAllGroups();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ChatGroup> getGroupById(@PathVariable("id") Long id) {
        ChatGroup group = chatGroupService.getGroupById(id);
        return group != null ? ResponseEntity.ok(group) : ResponseEntity.notFound().build();
    }

    @PostMapping
    public ChatGroup createGroup(@RequestBody ChatGroup chatGroup) {
        if (chatGroup.getCreatedAt() == null) {
            chatGroup.setCreatedAt(Instant.now());
        }
        return chatGroupService.createGroup(chatGroup);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ChatGroup> updateGroup(@PathVariable("id") Long id, @RequestBody ChatGroup updatedGroup) {
        ChatGroup group = chatGroupService.updateGroup(id, updatedGroup);
        return group != null ? ResponseEntity.ok(group) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGroup(@PathVariable("id") Long id) {
        chatGroupService.deleteGroup(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{groupId}/join/{userId}")
    public ResponseEntity<ChatGroup> joinGroup(@PathVariable("groupId") Long groupId, @PathVariable("userId") Long userId) {
        ChatGroup group = chatGroupService.joinGroup(groupId, userId);
        return group != null ? ResponseEntity.ok(group) : ResponseEntity.notFound().build();
    }
}
