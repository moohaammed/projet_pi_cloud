package esprit.tn.backpi.services;

import esprit.tn.backpi.entities.ChatGroup;
import esprit.tn.backpi.entities.User;
import esprit.tn.backpi.repositories.ChatGroupRepository;
import esprit.tn.backpi.repositories.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ChatGroupService {

    private final ChatGroupRepository chatGroupRepository;
    private final UserRepository userRepository;

    public ChatGroupService(ChatGroupRepository chatGroupRepository, UserRepository userRepository) {
        this.chatGroupRepository = chatGroupRepository;
        this.userRepository = userRepository;
    }

    public List<ChatGroup> getAllGroups() {
        return chatGroupRepository.findAll();
    }

    public ChatGroup getGroupById(Long id) {
        return chatGroupRepository.findById(id).orElse(null);
    }

    public ChatGroup createGroup(ChatGroup chatGroup) {
        return chatGroupRepository.save(chatGroup);
    }

    public ChatGroup updateGroup(Long id, ChatGroup updatedGroup) {
        return chatGroupRepository.findById(id).map(existingGroup -> {
            existingGroup.setName(updatedGroup.getName());
            existingGroup.setDescription(updatedGroup.getDescription());
            return chatGroupRepository.save(existingGroup);
        }).orElse(null);
    }

    public void deleteGroup(Long id) {
        chatGroupRepository.deleteById(id);
    }

    public ChatGroup joinGroup(Long groupId, Long userId) {
        ChatGroup group = chatGroupRepository.findById(groupId).orElse(null);
        User user = userRepository.findById(userId).orElse(null);
        if (group != null && user != null) {
            group.getMembers().add(user);
            return chatGroupRepository.save(group);
        }
        return null;
    }
}
