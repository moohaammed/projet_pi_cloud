package esprit.tn.backpi.services.collaboration;

import esprit.tn.backpi.dto.collaboration.ChatGroupCreateDto;
import esprit.tn.backpi.dto.collaboration.ChatGroupResponseDto;
import esprit.tn.backpi.dto.collaboration.MemberDto;
import esprit.tn.backpi.entities.User;
import esprit.tn.backpi.entities.collaboration.ChatGroup;
import esprit.tn.backpi.repositories.UserRepository;
import esprit.tn.backpi.repositories.collaboration.ChatGroupRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ChatGroupService {

    private final ChatGroupRepository chatGroupRepository;
    private final UserRepository userRepository;

    public ChatGroupService(ChatGroupRepository chatGroupRepository, UserRepository userRepository) {
        this.chatGroupRepository = chatGroupRepository;
        this.userRepository = userRepository;
    }

    public List<ChatGroupResponseDto> getAllGroups() {
        return chatGroupRepository.findAll().stream()
                .map(this::mapToResponseDto)
                .collect(Collectors.toList());
    }

    public ChatGroupResponseDto getGroupById(Long id) {
        return chatGroupRepository.findById(id)
                .map(this::mapToResponseDto)
                .orElse(null);
    }

    public ChatGroupResponseDto createGroup(ChatGroupCreateDto dto) {
        ChatGroup group = new ChatGroup();
        group.setName(dto.getName());
        group.setDescription(dto.getDescription());
        group.setTheme(dto.getTheme());
        group.setCreatedAt(Instant.now());

        Set<User> members = new HashSet<>();
        if (dto.getMemberIds() != null) {
            for (Long memberId : dto.getMemberIds()) {
                userRepository.findById(memberId).ifPresent(members::add);
            }
        }
        group.setMembers(members);

        return mapToResponseDto(chatGroupRepository.save(group));
    }

    public ChatGroupResponseDto updateGroup(Long id, ChatGroupCreateDto dto) {
        return chatGroupRepository.findById(id).map(existingGroup -> {
            existingGroup.setName(dto.getName());
            existingGroup.setDescription(dto.getDescription());
            existingGroup.setTheme(dto.getTheme());
            
            Set<User> members = new HashSet<>();
            if (dto.getMemberIds() != null) {
                for (Long memberId : dto.getMemberIds()) {
                    userRepository.findById(memberId).ifPresent(members::add);
                }
            }
            existingGroup.setMembers(members);
            
            return mapToResponseDto(chatGroupRepository.save(existingGroup));
        }).orElse(null);
    }

    public void deleteGroup(Long id) {
        chatGroupRepository.deleteById(id);
    }

    public ChatGroupResponseDto joinGroup(Long groupId, Long userId) {
        ChatGroup group = chatGroupRepository.findById(groupId).orElse(null);
        User user = userRepository.findById(userId).orElse(null);
        if (group != null && user != null) {
            group.getMembers().add(user);
            return mapToResponseDto(chatGroupRepository.save(group));
        }
        return null;
    }

    // Helper Mapping Method
    private ChatGroupResponseDto mapToResponseDto(ChatGroup group) {
        ChatGroupResponseDto dto = new ChatGroupResponseDto();
        dto.setId(group.getId());
        dto.setName(group.getName());
        dto.setDescription(group.getDescription());
        dto.setTheme(group.getTheme());
        dto.setCreatedAt(group.getCreatedAt());

        if (group.getMembers() != null) {
            List<MemberDto> memberDtos = group.getMembers().stream()
                    .map(u -> new MemberDto(u.getId(), u.getName()))
                    .collect(Collectors.toList());
            dto.setMembers(memberDtos);
        }

        return dto;
    }
}
