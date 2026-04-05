package esprit.tn.backpi.services.collaboration;

import esprit.tn.backpi.dto.collaboration.ChatGroupCreateDto;
import esprit.tn.backpi.dto.collaboration.ChatGroupResponseDto;
import esprit.tn.backpi.dto.collaboration.MemberDto;
import esprit.tn.backpi.entities.collaboration.ChatGroup;
import esprit.tn.backpi.entities.collaboration.GroupCategory;
import esprit.tn.backpi.entities.collaboration.GroupJoinRequest;
import esprit.tn.backpi.entities.collaboration.JoinRequestStatus;
import esprit.tn.backpi.entity.Role;
import esprit.tn.backpi.entity.User;
import esprit.tn.backpi.repositories.collaboration.ChatGroupRepository;
import esprit.tn.backpi.repositories.collaboration.GroupJoinRequestRepository;
import esprit.tn.backpi.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ChatGroupService {

    private final ChatGroupRepository chatGroupRepository;
    private final UserRepository userRepository;
    private final GroupJoinRequestRepository groupJoinRequestRepository;
    private final NotificationService notificationService;

    public ChatGroupService(ChatGroupRepository chatGroupRepository, 
                            UserRepository userRepository,
                            GroupJoinRequestRepository groupJoinRequestRepository,
                            NotificationService notificationService) {
        this.chatGroupRepository = chatGroupRepository;
        this.userRepository = userRepository;
        this.groupJoinRequestRepository = groupJoinRequestRepository;
        this.notificationService = notificationService;
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

        if (dto.getOwnerId() != null) {
            userRepository.findById(dto.getOwnerId()).ifPresent(group::setOwner);
        }

        Set<User> members = new HashSet<>();
        if (dto.getMemberIds() != null) {
            for (Long memberId : dto.getMemberIds()) {
                userRepository.findById(memberId).ifPresent(members::add);
            }
        }
        
        // Ensure owner is a member
        if (group.getOwner() != null) {
            members.add(group.getOwner());
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

    public void requestToJoinGroup(Long groupId, Long userId) {
        ChatGroup group = chatGroupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (groupJoinRequestRepository.existsByGroupIdAndUserIdAndStatus(groupId, userId, JoinRequestStatus.PENDING)) {
            throw new RuntimeException("A join request is already pending for this group");
        }

        if (group.getMembers().contains(user)) {
            throw new RuntimeException("User is already a member of this group");
        }

        GroupJoinRequest request = new GroupJoinRequest();
        request.setGroup(group);
        request.setUser(user);
        request.setStatus(JoinRequestStatus.PENDING);
        groupJoinRequestRepository.save(request);

        if (group.getOwner() != null) {
            String requesterName = (user.getPrenom() + " " + user.getNom()).trim();
            notificationService.createAndSend(
                group.getOwner().getId(),
                requesterName + " wants to join your group \"" + group.getName() + "\"",
                "GROUP_JOIN_REQUEST"
            );
        }
    }

    public void approveJoinRequest(Long requestId) {
        GroupJoinRequest request = groupJoinRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));
        
        request.setStatus(JoinRequestStatus.ACCEPTED);
        groupJoinRequestRepository.save(request);

        ChatGroup group = request.getGroup();
        group.getMembers().add(request.getUser());
        chatGroupRepository.save(group);

        notificationService.createAndSend(
            request.getUser().getId(),
            "Your request to join \"" + group.getName() + "\" has been accepted!",
            "GROUP_JOIN_ACCEPTED"
        );
    }

    public void rejectJoinRequest(Long requestId) {
        GroupJoinRequest request = groupJoinRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));
        
        request.setStatus(JoinRequestStatus.REJECTED);
        groupJoinRequestRepository.save(request);

        notificationService.createAndSend(
            request.getUser().getId(),
            "Your request to join \"" + request.getGroup().getName() + "\" was rejected.",
            "GROUP_JOIN_REJECTED"
        );
    }

    public List<GroupJoinRequest> getPendingRequestsForOwner(Long ownerId) {
        return groupJoinRequestRepository.findByGroupOwnerIdAndStatus(ownerId, JoinRequestStatus.PENDING);
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

    @Transactional
    public void assignUserToDefaultGroup(User user) {
        if (user == null || user.getRole() == null || user.getRole() == esprit.tn.backpi.entity.Role.ADMIN) {
            return;
        }

        String groupName = "";
        String description = "";
        String theme = "";
        GroupCategory category = GroupCategory.MIXED;
        
        System.out.println("DEBUG: Assigning User " + user.getId() + " (Role: " + user.getRole() + ") to default group");

        if (user.getRole() == esprit.tn.backpi.entity.Role.DOCTOR) {
            groupName = "Doctors Community";
            description = "A private space for doctors to collaborate and share expertise.";
            theme = "SUPPORT";
            category = GroupCategory.PROFESSIONAL;
        } else if (user.getRole() == esprit.tn.backpi.entity.Role.PATIENT) {
            groupName = "Patients Support Group";
            description = "A supportive community for patients to share experiences and find comfort.";
            theme = "SUPPORT";
            category = GroupCategory.PATIENTS;
        } else {
            return; 
        }

        final String finalGroupName = groupName;
        final String finalDescription = description;
        final String finalTheme = theme;
        final GroupCategory finalCategory = category;

        ChatGroup group = chatGroupRepository.findByName(finalGroupName)
                .orElseGet(() -> {
                    System.out.println("DEBUG: Creating new default group: " + finalGroupName);
                    ChatGroup newGroup = new ChatGroup();
                    newGroup.setName(finalGroupName);
                    newGroup.setDescription(finalDescription);
                    newGroup.setTheme(finalTheme);
                    newGroup.setCategory(finalCategory);
                    newGroup.setCreatedAt(Instant.now());
                    return chatGroupRepository.save(newGroup);
                });

        if (group.getMembers() == null) {
            group.setMembers(new HashSet<>());
        }

        if (!group.getMembers().contains(user)) {
            group.getMembers().add(user);
            chatGroupRepository.save(group);
            System.out.println("DEBUG: Successfully added User " + user.getId() + " to group: " + finalGroupName);
        } else {
            System.out.println("DEBUG: User " + user.getId() + " is already a member of " + finalGroupName);
        }
    }

    public ChatGroupResponseDto leaveGroup(Long groupId, Long userId) {
        ChatGroup group = chatGroupRepository.findById(groupId).orElse(null);
        User user = userRepository.findById(userId).orElse(null);
        if (group != null && user != null) {
            group.getMembers().remove(user);
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
        if (group.getCategory() != null) {
            dto.setCategory(group.getCategory().name());
        }
        dto.setCreatedAt(group.getCreatedAt());

        if (group.getOwner() != null) {
            dto.setOwnerId(group.getOwner().getId());
            String ownerFullName = (group.getOwner().getPrenom() + " " + group.getOwner().getNom()).trim();
            dto.setOwnerName(ownerFullName.isEmpty() ? "User " + group.getOwner().getId() : ownerFullName);
        }

        if (group.getMembers() != null) {
            List<MemberDto> memberDtos = group.getMembers().stream()
                    .map(u -> new MemberDto(u.getId(), (u.getPrenom() + " " + u.getNom()).trim()))
                    .collect(Collectors.toList());
            dto.setMembers(memberDtos);
        }

        return dto;
    }
}
