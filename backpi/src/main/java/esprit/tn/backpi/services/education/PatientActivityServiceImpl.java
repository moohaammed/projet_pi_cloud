package esprit.tn.backpi.services.education;

import esprit.tn.backpi.dto.PatientActivitySubmitDto;
import esprit.tn.backpi.dto.ScoreStadeDto;
import esprit.tn.backpi.entities.education.Activity;
import esprit.tn.backpi.entities.education.PatientActivity;
import esprit.tn.backpi.entity.User;
import esprit.tn.backpi.exception.ResourceNotFoundException;
import esprit.tn.backpi.repositories.education.ActivityRepository;
import esprit.tn.backpi.repositories.education.PatientActivityRepository;
import esprit.tn.backpi.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class PatientActivityServiceImpl implements PatientActivityService {

    @Autowired
    private PatientActivityRepository patientActivityRepository;

    @Autowired
    private ActivityRepository activityRepository;

    @Autowired
    private UserRepository userRepository;

    @Override
    @Transactional
    public PatientActivity submitSession(PatientActivitySubmitDto dto) {
        User user = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id " + dto.getUserId()));

        Activity activity = activityRepository.findById(dto.getActivityId())
                .orElseThrow(() -> new ResourceNotFoundException("Activity not found with id " + dto.getActivityId()));

        PatientActivity patientActivity = new PatientActivity();
        patientActivity.setUser(user);
        patientActivity.setActivity(activity);

        Activity.ActivityType type = activity.getType();

        // Fetch previous state specifically for this activity type
        Optional<PatientActivity> lastActivity = patientActivityRepository.findFirstByUserAndActivity_TypeOrderByPlayedAtDesc(user, type);
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
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id " + userId));

        Optional<PatientActivity> lastQuiz = patientActivityRepository.findFirstByUserAndActivity_TypeOrderByPlayedAtDesc(user, Activity.ActivityType.QUIZ);
        Optional<PatientActivity> lastGame = patientActivityRepository.findFirstByUserAndActivity_TypeOrderByPlayedAtDesc(user, Activity.ActivityType.GAME);

        Long scoreQuiz = lastQuiz.map(PatientActivity::getScoreCumule).orElse(0L);
        Activity.Stade stadeQuiz = lastQuiz.map(PatientActivity::getCurrentStade).orElse(Activity.Stade.LEGER);

        Long scoreGame = lastGame.map(PatientActivity::getScoreCumule).orElse(0L);
        Activity.Stade stadeGame = lastGame.map(PatientActivity::getCurrentStade).orElse(Activity.Stade.LEGER);

        // Compute completed stages (successful ones)
        List<Activity.Stade> completedStagesQuiz = patientActivityRepository.findAllByUserAndActivity_TypeAndReussiTrue(user, Activity.ActivityType.QUIZ)
                .stream().map(PatientActivity::getCurrentStade).distinct().toList();
        
        List<Activity.Stade> completedStagesGame = patientActivityRepository.findAllByUserAndActivity_TypeAndReussiTrue(user, Activity.ActivityType.GAME)
                .stream().map(PatientActivity::getCurrentStade).distinct().toList();

        return new ScoreStadeDto(scoreQuiz, stadeQuiz, completedStagesQuiz, scoreGame, stadeGame, completedStagesGame);
    }

    @Override
    public List<PatientActivity> getPatientHistory(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id " + userId));
        return patientActivityRepository.findAllByUserOrderByPlayedAtDesc(user);
    }

    @Override
    @Transactional
    public void resetPatient(Long userId, String type) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id " + userId));
        
        if (type == null || type.equalsIgnoreCase("ALL")) {
            patientActivityRepository.deleteByUser(user);
        } else {
            try {
                Activity.ActivityType actType = Activity.ActivityType.valueOf(type.toUpperCase());
                patientActivityRepository.deleteByUserAndActivity_Type(user, actType);
            } catch (IllegalArgumentException e) {
                // Ignore Invalid type
            }
        }
    }
}
