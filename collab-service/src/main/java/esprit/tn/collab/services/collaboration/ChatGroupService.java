package esprit.tn.collab.services.collaboration;

import esprit.tn.collab.clients.UserClient;
import esprit.tn.collab.dto.collaboration.ChatGroupCreateDto;
import esprit.tn.collab.dto.collaboration.ChatGroupResponseDto;
import esprit.tn.collab.dto.collaboration.MemberDto;
import esprit.tn.collab.entities.collaboration.ChatGroup;
import esprit.tn.collab.entities.collaboration.GroupCategory;
import esprit.tn.collab.entities.collaboration.GroupJoinRequest;
import esprit.tn.collab.entities.collaboration.JoinRequestStatus;
import esprit.tn.collab.repositories.collaboration.ChatGroupRepository;
import esprit.tn.collab.repositories.collaboration.GroupJoinRequestRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ChatGroupService {

    private final ChatGroupRepository chatGroupRepository;
    private final GroupJoinRequestRepository groupJoinRequestRepository;
    private final NotificationService notificationService;
    private final UserClient userClient;

    public ChatGroupService(ChatGroupRepository chatGroupRepository,
                            GroupJoinRequestRepository groupJoinRequestRepository,
                            NotificationService notificationService,
                            UserClient userClient) {
        this.chatGroupRepository = chatGroupRepository;
        this.groupJoinRequestRepository = groupJoinRequestRepository;
        this.notificationService = notificationService;
        this.userClient = userClient;
    }

    public List<ChatGroupResponseDto> getAllGroups() {
        return chatGroupRepository.findAll().stream().map(this::mapToResponseDto).collect(Collectors.toList());
    }

    public ChatGroupResponseDto getGroupById(Long id) {
        return chatGroupRepository.findById(id).map(this::mapToResponseDto).orElse(null);
    }

    @Transactional
    public ChatGroupResponseDto createGroup(ChatGroupCreateDto dto) {
        ChatGroup group = new ChatGroup();
        group.setName(dto.getName());
        group.setDescription(dto.getDescription());
        group.setTheme(dto.getTheme());
        group.setCreatedAt(Instant.now());
        group.setOwnerId(dto.getOwnerId());
        if (dto.getMemberIds() != null) {
            group.setMemberIds(new HashSet<>(dto.getMemberIds()));
        }
        if (dto.getOwnerId() != null) {
            group.getMemberIds().add(dto.getOwnerId());
        }
        return mapToResponseDto(chatGroupRepository.save(group));
    }

    @Transactional
    public ChatGroupResponseDto updateGroup(Long id, ChatGroupCreateDto dto) {
        return chatGroupRepository.findById(id).map(group -> {
            group.setName(dto.getName());
            group.setDescription(dto.getDescription());
            group.setTheme(dto.getTheme());
            return mapToResponseDto(chatGroupRepository.save(group));
        }).orElse(null);
    }

    @Transactional
    public void deleteGroup(Long id) {
        chatGroupRepository.deleteById(id);
    }

    @Transactional
    public ChatGroupResponseDto joinGroup(Long groupId, Long userId) {
        return chatGroupRepository.findById(groupId).map(group -> {
            group.getMemberIds().add(userId);
            return mapToResponseDto(chatGroupRepository.save(group));
        }).orElse(null);
    }

    @Transactional
    public ChatGroupResponseDto leaveGroup(Long groupId, Long userId) {
        return chatGroupRepository.findById(groupId).map(group -> {
            group.getMemberIds().remove(userId);
            return mapToResponseDto(chatGroupRepository.save(group));
        }).orElse(null);
    }

    @Transactional
    public void requestToJoinGroup(Long groupId, Long userId) {
        if (groupJoinRequestRepository.existsByGroupIdAndUserIdAndStatus(groupId, userId, JoinRequestStatus.PENDING)) return;
        ChatGroup group = chatGroupRepository.findById(groupId).orElseThrow();
        GroupJoinRequest req = new GroupJoinRequest();
        req.setUserId(userId);
        req.setGroup(group);
        groupJoinRequestRepository.save(req);
        if (group.getOwnerId() != null) {
            notificationService.createAndSend(group.getOwnerId(), "User " + userId + " requested to join \"" + group.getName() + "\"", "JOIN_REQUEST");
        }
    }

    @Transactional
    public void approveJoinRequest(Long requestId) {
        groupJoinRequestRepository.findById(requestId).ifPresent(req -> {
            req.setStatus(JoinRequestStatus.ACCEPTED);
            req.getGroup().getMemberIds().add(req.getUserId());
            chatGroupRepository.save(req.getGroup());
            groupJoinRequestRepository.save(req);
            notificationService.createAndSend(req.getUserId(), "Your request to join \"" + req.getGroup().getName() + "\" was approved!", "JOIN_APPROVED");
        });
    }

    @Transactional
    public void rejectJoinRequest(Long requestId) {
        groupJoinRequestRepository.findById(requestId).ifPresent(req -> {
            req.setStatus(JoinRequestStatus.REJECTED);
            groupJoinRequestRepository.save(req);
        });
    }

    public List<GroupJoinRequest> getPendingRequestsForOwner(Long ownerId) {
        return groupJoinRequestRepository.findByGroupOwnerIdAndStatus(ownerId, JoinRequestStatus.PENDING);
    }

    public ChatGroupResponseDto mapToResponseDto(ChatGroup group) {
        ChatGroupResponseDto dto = new ChatGroupResponseDto();
        dto.setId(group.getId());
        dto.setName(group.getName());
        dto.setDescription(group.getDescription());
        dto.setTheme(group.getTheme());
        dto.setCategory(group.getCategory() != null ? group.getCategory().name() : GroupCategory.MIXED.name());
        dto.setCreatedAt(group.getCreatedAt());
        dto.setOwnerId(group.getOwnerId());

        if (group.getOwnerId() != null) {
            Map<String, Object> owner = userClient.getUserById(group.getOwnerId());
            dto.setOwnerName(userClient.getFullName(owner));
        }

        List<MemberDto> members = group.getMemberIds().stream().map(uid -> {
            Map<String, Object> u = userClient.getUserById(uid);
            return new MemberDto(uid, userClient.getFullName(u));
        }).collect(Collectors.toList());
        dto.setMembers(members);

        return dto;
    }
}
