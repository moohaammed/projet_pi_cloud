package esprit.tn.education.services;

import esprit.tn.education.dto.PatientActivitySubmitDto;
import esprit.tn.education.dto.ScoreStadeDto;
import esprit.tn.education.entities.Activity;
import esprit.tn.education.entities.PatientActivity;
import esprit.tn.education.exception.ResourceNotFoundException;
import esprit.tn.education.repositories.ActivityRepository;
import esprit.tn.education.repositories.PatientActivityRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class PatientActivityServiceImpl implements PatientActivityService {

    @Autowired
    private PatientActivityRepository patientActivityRepository;

    @Autowired
    private ActivityRepository activityRepository;

    @Override
    public PatientActivity submitSession(PatientActivitySubmitDto dto) {
        // We assume userId is valid since it's passed from the caller (e.g. Gateway/Frontend)
        
        Activity activity = activityRepository.findById(dto.getActivityId())
                .orElseThrow(() -> new ResourceNotFoundException("Activity not found with id " + dto.getActivityId()));

        PatientActivity patientActivity = new PatientActivity();
        patientActivity.setUserId(dto.getUserId());
        patientActivity.setActivityId(dto.getActivityId());
        patientActivity.setActivityType(activity.getType());

        Activity.ActivityType type = activity.getType();

        // Fetch previous state specifically for this activity type
        Optional<PatientActivity> lastActivity = patientActivityRepository.findFirstByUserIdAndActivityTypeOrderByPlayedAtDesc(dto.getUserId(), type);
        Long previousScore = lastActivity.map(PatientActivity::getScoreCumule).orElse(0L);
        Activity.Stade previousStade = lastActivity.map(PatientActivity::getCurrentStade).orElse(Activity.Stade.LEGER);

        // Core business logic computation
        int bonnesReponses = dto.getBonnesReponses() != null ? dto.getBonnesReponses() : 0;
        int mauvaisesReponses = dto.getMauvaisesReponses() != null ? dto.getMauvaisesReponses() : 0;
        int scoreSession = bonnesReponses * 10;
        
        patientActivity.setBonnesReponses(bonnesReponses);
        patientActivity.setMauvaisesReponses(mauvaisesReponses);
        patientActivity.setScoreSession((long) scoreSession);
        patientActivity.setScoreCumule(previousScore + scoreSession);
        patientActivity.setDureeSecondes(dto.getDureeSecondes() != null ? dto.getDureeSecondes() : 0);

        // Threshold for success: >= 50%
        boolean reussi = true;
        if (bonnesReponses + mauvaisesReponses > 0) {
            float successRate = (float) bonnesReponses / (bonnesReponses + mauvaisesReponses);
            reussi = successRate >= 0.5f;
        }
        patientActivity.setReussi(reussi);

        // Stage transition logic: Si reussi = false -> stade passe au niveau superieur (maladie plus grave)
        Activity.Stade nextStade = previousStade;
        if (!reussi) {
            if (previousStade == Activity.Stade.LEGER) {
                nextStade = Activity.Stade.MODERE;
            } else if (previousStade == Activity.Stade.MODERE) {
                nextStade = Activity.Stade.SEVERE;
            }
        }
        patientActivity.setCurrentStade(nextStade);

        return patientActivityRepository.save(patientActivity);
    }

    @Override
    public ScoreStadeDto getPatientScoreAndStade(Long userId) {
        Optional<PatientActivity> lastQuiz = patientActivityRepository.findFirstByUserIdAndActivityTypeOrderByPlayedAtDesc(userId, Activity.ActivityType.QUIZ);
        Optional<PatientActivity> lastGame = patientActivityRepository.findFirstByUserIdAndActivityTypeOrderByPlayedAtDesc(userId, Activity.ActivityType.GAME);

        Long scoreQuiz = lastQuiz.map(PatientActivity::getScoreCumule).orElse(0L);
        Activity.Stade stadeQuiz = lastQuiz.map(PatientActivity::getCurrentStade).orElse(Activity.Stade.LEGER);

        Long scoreGame = lastGame.map(PatientActivity::getScoreCumule).orElse(0L);
        Activity.Stade stadeGame = lastGame.map(PatientActivity::getCurrentStade).orElse(Activity.Stade.LEGER);

        // Compute completed stages (successful ones)
        List<Activity.Stade> completedStagesQuiz = patientActivityRepository.findAllByUserIdAndActivityTypeAndReussiTrue(userId, Activity.ActivityType.QUIZ)
                .stream().map(PatientActivity::getCurrentStade).distinct().toList();
        
        List<Activity.Stade> completedStagesGame = patientActivityRepository.findAllByUserIdAndActivityTypeAndReussiTrue(userId, Activity.ActivityType.GAME)
                .stream().map(PatientActivity::getCurrentStade).distinct().toList();

        return new ScoreStadeDto(scoreQuiz, stadeQuiz, completedStagesQuiz, scoreGame, stadeGame, completedStagesGame);
    }

    @Override
    public List<PatientActivity> getPatientHistory(Long userId) {
        return patientActivityRepository.findAllByUserIdOrderByPlayedAtDesc(userId);
    }

    @Override
    public void resetPatient(Long userId, String type) {
        if (type == null || type.equalsIgnoreCase("ALL")) {
            patientActivityRepository.deleteByUserId(userId);
        } else {
            try {
                Activity.ActivityType actType = Activity.ActivityType.valueOf(type.toUpperCase());
                patientActivityRepository.deleteByUserIdAndActivityType(userId, actType);
            } catch (IllegalArgumentException e) {
                // Ignore Invalid type
            }
        }
    }
}
