package esprit.tn.backpi.controller;

import esprit.tn.backpi.dto.PatientHeartRateAccessDto;
import esprit.tn.backpi.service.HeartRateAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/heart-rate-access")
@CrossOrigin(originPatterns = "*")
@RequiredArgsConstructor
public class HeartRateAccessController {

    private final HeartRateAccessService heartRateAccessService;

    @GetMapping("/doctor/{doctorUserId}/patients")
    public ResponseEntity<List<PatientHeartRateAccessDto>> getDoctorPatients(
            @PathVariable Long doctorUserId) {
        return ResponseEntity.ok(heartRateAccessService.getPatientsForDoctor(doctorUserId));
    }

    @GetMapping("/admin/{adminUserId}/patients")
    public ResponseEntity<List<PatientHeartRateAccessDto>> getAdminPatients(
            @PathVariable Long adminUserId) {
        return ResponseEntity.ok(heartRateAccessService.getPatientsForAdmin(adminUserId));
    }

    @GetMapping("/relation/{relationUserId}/patient")
    public ResponseEntity<PatientHeartRateAccessDto> getRelationLinkedPatient(
            @PathVariable Long relationUserId) {
        return heartRateAccessService.getLinkedPatientForRelation(relationUserId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/relation/{relationUserId}/patients")
    public ResponseEntity<List<PatientHeartRateAccessDto>> getRelationPatients(
            @PathVariable Long relationUserId) {
        return ResponseEntity.ok(heartRateAccessService.getPatientsForRelation(relationUserId));
    }
}
