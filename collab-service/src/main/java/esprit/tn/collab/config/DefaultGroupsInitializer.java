package esprit.tn.collab.config;

import esprit.tn.collab.clients.UserClient;
import esprit.tn.collab.entities.collaboration.ChatGroup;
import esprit.tn.collab.entities.collaboration.GroupCategory;
import esprit.tn.collab.repositories.collaboration.ChatGroupRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
public class DefaultGroupsInitializer implements ApplicationRunner {

    private final ChatGroupRepository chatGroupRepository;
    private final UserClient userClient;

    public DefaultGroupsInitializer(ChatGroupRepository chatGroupRepository, UserClient userClient) {
        this.chatGroupRepository = chatGroupRepository;
        this.userClient = userClient;
    }

    @Override
    public void run(ApplicationArguments args) {
        ensureDefaultGroup(
            "Patients Community",
            "A safe space for all patients to share experiences, support each other, and stay connected.",
            GroupCategory.PATIENTS,
            "PATIENT"
        );
        ensureDefaultGroup(
            "Medical Professionals",
            "A dedicated circle for doctors, caregivers, and clinical staff to collaborate and coordinate care.",
            GroupCategory.PROFESSIONAL,
            "DOCTOR"
        );
    }

    private void ensureDefaultGroup(String name, String description, GroupCategory category, String role) {
        // Find existing default group for this role, or create it
        List<ChatGroup> existing = chatGroupRepository.findByIsDefaultTrueAndDefaultForRole(role);
        ChatGroup group;

        if (existing.isEmpty()) {
            group = new ChatGroup();
            group.setName(name);
            group.setDescription(description);
            group.setCategory(category);
            group.setDefault(true);
            group.setDefaultForRole(role);
            group.setCreatedAt(Instant.now());
            group.setMemberIds(new HashSet<>());
        } else {
            group = existing.get(0);
        }

        // Sync all users of this role into the group
        List<Map<String, Object>> users = userClient.getUsersByRole(role);
        Set<Long> memberIds = group.getMemberIds() != null ? group.getMemberIds() : new HashSet<>();
        for (Map<String, Object> user : users) {
            Object idObj = user.get("id");
            if (idObj != null) {
                long uid = ((Number) idObj).longValue();
                memberIds.add(uid);
            }
        }
        group.setMemberIds(memberIds);
        chatGroupRepository.save(group);
    }
}
