package esprit.tn.backpi.services.education;

import esprit.tn.backpi.dto.PatientActivitySubmitDto;
import esprit.tn.backpi.dto.ScoreStadeDto;
import esprit.tn.backpi.entities.education.PatientActivity;

import java.util.List;

public interface PatientActivityService {
    PatientActivity submitSession(PatientActivitySubmitDto dto);
    ScoreStadeDto getPatientScoreAndStade(Long userId);
    List<PatientActivity> getPatientHistory(Long userId);
    void resetPatient(Long userId, String type);
}
