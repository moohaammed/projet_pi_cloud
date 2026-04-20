package esprit.tn.education.services;

import esprit.tn.education.dto.PatientActivitySubmitDto;
import esprit.tn.education.dto.ScoreStadeDto;
import esprit.tn.education.entities.PatientActivity;

import java.util.List;

public interface PatientActivityService {
    PatientActivity submitSession(PatientActivitySubmitDto dto);
    ScoreStadeDto getPatientScoreAndStade(Long userId);
    List<PatientActivity> getPatientHistory(Long userId);
    void resetPatient(Long userId, String type);
}
