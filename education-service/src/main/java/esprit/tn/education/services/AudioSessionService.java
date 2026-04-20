package esprit.tn.education.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import esprit.tn.education.dto.*;
import esprit.tn.education.entities.AudioExchange;
import esprit.tn.education.entities.AudioQuestion;
import esprit.tn.education.entities.AudioSession;
import esprit.tn.education.repositories.AudioSessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class AudioSessionService {

    private static final Logger log = LoggerFactory.getLogger(AudioSessionService.class);

    @Autowired
    private AudioSessionRepository audioSessionRepository;

    @Autowired
    private YouTubeTranscriptService youTubeTranscriptService;

    // ── LLM configuration (from application.properties) ──────────
    @Value("${openrouter.api.key}")
    private String apiKey;

    @Value("${openrouter.model:mistralai/mistral-7b-instruct}")
    private String model;

    @Value("${openrouter.api.url:https://openrouter.ai/api/v1/chat/completions}")
    private String apiUrl;

    @Value("${openrouter.timeout.seconds:30}")
    private int timeoutSeconds;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // ══════════════════════════════════════════════════════════════
    //  PUBLIC API  (unchanged — controllers untouched)
    // ══════════════════════════════════════════════════════════════

    /**
     * Initialises a new audio session.
     * 1. Tries to fetch the real YouTube transcript from the video URL
     * 2. Falls back to the admin-supplied description if transcript is unavailable
     * 3. Sends the best available content to the LLM
     */
    public InitSessionResponse initSession(InitSessionRequest req) {

        // Resolve language (default = fr)
        String lang = (req.getLanguage() != null && req.getLanguage().equalsIgnoreCase("en")) ? "en" : "fr";

        // ── 1. Attempt to get the real video transcript ──────────
        String transcript = "";
        log.info("AudioSession INIT: activityId={}, patientId={}, videoUrl={}, lang={}",
                req.getActivityId(), req.getPatientId(), req.getVideoUrl(), lang);

        if (req.getVideoUrl() != null && !req.getVideoUrl().isBlank()) {
            transcript = youTubeTranscriptService.fetchTranscript(req.getVideoUrl());
            if (!transcript.isBlank()) {
                log.info("CONTENT FETCH SUCCEEDED ({} chars). Starts with: {}",
                        transcript.length(), transcript.substring(0, Math.min(100, transcript.length())));
            } else {
                log.warn("TRANSCRIPT FETCH FAILED for URL: {}. AI will be in 'Honest Failure' mode.", req.getVideoUrl());
            }
        } else {
            log.warn("NO VIDEO URL provided in the request. AI will have no video context.");
        }

        // ── 2. Generate summary + questions via LLM ─────────────
        LlmResult llmResult = generateSummaryAndQuestions(
                req.getActivityDescription(),
                req.getActivityTitle(),
                transcript,
                lang);

        AudioSession session = AudioSession.builder()
                .activityId(req.getActivityId())
                .patientId(req.getPatientId())
                .sessionStatus("IN_PROGRESS")
                .language(lang)
                .summary(llmResult.summary())
                .questions(llmResult.questions())
                .currentQuestionIndex(0)
                .totalQuestions(llmResult.questions().size())
                .build();

        llmResult.summary().forEach(line -> appendExchange(session, "AI", line));
        audioSessionRepository.save(session);

        String firstQuestion = llmResult.questions().isEmpty()
                ? ("en".equals(lang) ? "Thank you for watching this video!" : "Merci d'avoir regardé cette vidéo !")
                : llmResult.questions().get(0).getQuestionText();

        if (!llmResult.questions().isEmpty()) {
            appendExchange(session, "AI", firstQuestion);
            audioSessionRepository.save(session);
        }

        return InitSessionResponse.builder()
                .sessionId(session.getId())
                .summary(llmResult.summary())
                .firstQuestion(firstQuestion)
                .totalQuestions(session.getTotalQuestions())
                .build();
    }

    /** Processes a patient's spoken answer (or silence). */
    public ProcessAnswerResponse processAnswer(String sessionId, ProcessAnswerRequest req) {
        AudioSession session = getOrThrow(sessionId);
        String lang = session.getLanguage() != null ? session.getLanguage() : "fr";

        if (!"IN_PROGRESS".equals(session.getSessionStatus())) {
            return buildFinishedResponse(session);
        }

        int idx = session.getCurrentQuestionIndex();
        if (idx >= session.getQuestions().size()) {
            return finaliseSession(session);
        }

        AudioQuestion question = session.getQuestions().get(idx);
        String answerText = req.getAnswerText() == null ? "" : req.getAnswerText().trim();

        String patientText = answerText.isEmpty() ? ("en".equals(lang) ? "(silence)" : "(silence)") : answerText;
        appendExchange(session, "PATIENT", patientText);

        boolean isSilence = answerText.isEmpty();
        question.setAttempts(question.getAttempts() + 1);

        AnalysisResult analysis;
        if (isSilence) {
            session.setSilenceCount(session.getSilenceCount() + 1);
            String silenceMsg = "en".equals(lang) ? "No worries. Take your time." : "Ce n'est pas grave. Prenez votre temps.";
            analysis = new AnalysisResult("silence", silenceMsg, question.getHintText());
        } else {
            question.setPatientAnswer(answerText);
            analysis = analyzeResponse(
                    question.getQuestionText(),
                    question.getExpectedAnswer(),
                    answerText,
                    question.getHintText(),
                    lang);
        }

        question.setAnalysisStatus(analysis.status());
        question.setFeedbackText(analysis.feedback());

        // Do not increment global session totals here anymore to prevent totals exceeding max questions.
        // We will calculate final scores when the session finishes based on the final status of each question.

        appendExchange(session, "AI", analysis.feedback());

        // ── Retry / advance logic ───────────────────────────────
        boolean moveOn = false;
        String hint = "";

        if ("correct".equals(analysis.status())) {
            question.setCompleted(true);
            moveOn = true;
        } else if (question.getAttempts() >= 3) {
            String givenAnswer = "en".equals(lang)
                    ? "The answer was: " + question.getExpectedAnswer() + ". That's okay, let's continue."
                    : "La bonne réponse est : " + question.getExpectedAnswer() + ". C'est tout à fait normal, continuons.";
            appendExchange(session, "AI", givenAnswer);
            analysis = new AnalysisResult(analysis.status(), givenAnswer, "");
            question.setKeyInfoReinforced(true);
            question.setCompleted(true);
            moveOn = true;
        } else {
            hint = question.getHintText();
            if (hint != null && !hint.isEmpty()) {
                appendExchange(session, "AI", hint);
            }
        }

        String nextQuestion = null;

        if (moveOn) {
            session.setCurrentQuestionIndex(idx + 1);
            if (session.getCurrentQuestionIndex() >= session.getTotalQuestions()) {
                return finaliseSession(session);
            } else {
                AudioQuestion next = session.getQuestions().get(session.getCurrentQuestionIndex());
                nextQuestion = next.getQuestionText();
                appendExchange(session, "AI", nextQuestion);
            }
        }

        session.setUpdatedAt(LocalDateTime.now());
        audioSessionRepository.save(session);

        return ProcessAnswerResponse.builder()
                .status(analysis.status())
                .feedback(analysis.feedback())
                .hint(hint)
                .nextQuestion(nextQuestion)
                .sessionFinished(false)
                .currentQuestionIndex(session.getCurrentQuestionIndex())
                .totalQuestions(session.getTotalQuestions())
                .build();
    }

    /** Re-reads the current question (patient pressed "Répéter"). */
    public ProcessAnswerResponse repeatQuestion(String sessionId) {
        AudioSession session = getOrThrow(sessionId);
        String lang = session.getLanguage() != null ? session.getLanguage() : "fr";
        int idx = session.getCurrentQuestionIndex();

        if (idx >= session.getQuestions().size()) {
            return buildFinishedResponse(session);
        }

        AudioQuestion question = session.getQuestions().get(idx);
        String text = question.getQuestionText();
        String prefix = "en".equals(lang) ? "(repeat) " : "(répétition) ";

        appendExchange(session, "AI", prefix + text);
        audioSessionRepository.save(session);

        return ProcessAnswerResponse.builder()
                .status("repeat")
                .feedback(text)
                .hint(question.getHintText())
                .nextQuestion(null)
                .sessionFinished(false)
                .currentQuestionIndex(idx)
                .totalQuestions(session.getTotalQuestions())
                .build();
    }

    /** Stops the session early (patient pressed "Arrêter"). */
    public ProcessAnswerResponse stopSession(String sessionId) {
        AudioSession session = getOrThrow(sessionId);
        calculateAndSetScores(session);
        String lang = session.getLanguage() != null ? session.getLanguage() : "fr";
        session.setSessionStatus("STOPPED");
        session.setUpdatedAt(LocalDateTime.now());
        String stopMsg = "en".equals(lang)
                ? "The session is over. Well done for participating!"
                : "La séance est terminée. Bravo pour votre participation !";
        appendExchange(session, "AI", stopMsg);
        audioSessionRepository.save(session);

        return ProcessAnswerResponse.builder()
                .status("stopped")
                .feedback(stopMsg)
                .sessionFinished(true)
                .finalSummary(session.getSummary())
                .currentQuestionIndex(session.getCurrentQuestionIndex())
                .totalQuestions(session.getTotalQuestions())
                .correctAnswers(session.getCorrectAnswers())
                .partialAnswers(session.getPartialAnswers())
                .incorrectAnswers(session.getIncorrectAnswers())
                .build();
    }

    // ══════════════════════════════════════════════════════════════
    //  REAL LLM  —  generateSummaryAndQuestions
    // ══════════════════════════════════════════════════════════════

    /**
     * Calls the LLM (OpenRouter) to generate:
     * - 2–3 short French summary sentences based on the REAL video transcript
     * - 2 simple questions with expected answers and hints
     *
     * Priority of input: transcript > description > title
     */
    private LlmResult generateSummaryAndQuestions(String description, String title, String transcript, String lang) {
        String videoText = buildVideoText(description, title, transcript);
        boolean isEn = "en".equals(lang);

        String prompt = isEn ? """
            YOU ARE AN AI EXPERT FOR ALZHEIMER PATIENTS.
            YOUR MISSION: GENERATE A SUMMARY AND EXACTLY 4 QUESTIONS BASED ***ONLY*** ON THE REAL FACTS FROM THE CONTENT BELOW.

            ABSOLUTE PRIORITY ORDER:
            1. VIDEO TRANSCRIPT (The ONLY source of precise facts)
            2. DESCRIPTION (If transcript is absent)
            3. TITLE (For global context only)

            CONTENT TO ANALYZE:
            %s

            CRITICAL DIRECTIVES:
            - LANGUAGE: ALWAYS RESPOND IN VERY SIMPLE ENGLISH.
            - GENERATE EXACTLY 4 QUESTIONS. No more, no less.
            - QUESTIONS MUST FOCUS PRIMARILY ON THE MAIN PURPOSE AND CENTRAL SUBJECT OF THE VIDEO. Evaluate if the patient understood what the video is truly about.
            - Each question must address a DIFFERENT aspect of this central subject.
            - DO NOT ASK META-QUESTIONS about the video itself (e.g., NEVER ask "Did you like the video?", "Did you learn something?").
            - IF TRANSCRIPT IS PRESENT: Extract concrete details (words said, objects cited, actions) that support the main purpose.
            - IF TRANSCRIPT IS ABSENT: Admit it honestly and ask general knowledge questions related to the core topic of the title.
            - NO GENERIC PHRASES ALLOWED.
            - Sentences < 10 words. Gentle tone.

            RETURN ONLY JSON (session ID: %s):
            {
              "summary": ["precise fact 1", "precise fact 2", "precise fact 3"],
              "questions": [
                { "questionText": "First question about the main subject?", "expectedAnswer": "Short answer", "hintText": "Simple hint" },
                { "questionText": "Second question?", "expectedAnswer": "Short answer", "hintText": "Simple hint" },
                { "questionText": "Third question?", "expectedAnswer": "Short answer", "hintText": "Simple hint" },
                { "questionText": "Fourth question?", "expectedAnswer": "Short answer", "hintText": "Simple hint" }
              ]
            }
            """.formatted(videoText, java.util.UUID.randomUUID().toString())
        : """
            TU ES UNE IA EXPERTE POUR PATIENTS ALZHEIMER.
            TA MISSION : GÉNÉRER UN RÉSUMÉ ET EXACTEMENT 4 QUESTIONS BASÉES ***UNIQUEMENT*** SUR LES FAITS RÉELS DU CONTENU CI-DESSOUS.

            ORDRE DE PRIORITÉ ABSOLUE :
            1. TRANSCRIPTION DE LA VIDÉO (C'est la SEULE source de faits précis)
            2. DESCRIPTION (Si transcription absente)
            3. TITRE (Pour le contexte global uniquement)

            CONTENU À ANALYSER :
            %s

            DIRECTIVES CRITIQUES :
            - LANGUE : RÉPONSES TOUJOURS EN FRANÇAIS TRÈS SIMPLE.
            - GÉNÈRE EXACTEMENT 4 QUESTIONS. Ni plus, ni moins.
            - LES QUESTIONS DOIVENT PORTER PRINCIPALEMENT SUR L'OBJECTIF PRINCIPAL ET LE SUJET CENTRAL DE LA VIDÉO. Évalue si le patient a compris de quoi parle réellement la vidéo.
            - Chaque question doit aborder UN ASPECT DIFFÉRENT de ce sujet central.
            - NE POSE JAMAIS DE QUESTIONS MÉTA sur la vidéo elle-même (ex: NE DEMANDE JAMAIS "As-tu aimé la vidéo ?", "As-tu appris quelque chose ?").
            - SI UNE TRANSCRIPTION EST PRÉSENTE : Extrais des détails concrets qui soutiennent ce sujet principal (mots dits, objets cités, actions).
            - SI LA TRANSCRIPTION EST ABSENTE : Pose des questions simples de culture générale liées au sujet évoqué par le titre.
            - INTERDICTION DE PHRASES GÉNÉRIQUES.
            - Langage : Bienveillant, phrases de < 10 mots.

            RETOURNE UNIQUEMENT DU JSON (ID de session : %s) :
            {
              "summary": ["fait précis 1", "fait précis 2", "fait précis 3"],
              "questions": [
                { "questionText": "Première question sur le sujet principal ?", "expectedAnswer": "Réponse courte", "hintText": "Indice simple" },
                { "questionText": "Deuxième question ?", "expectedAnswer": "Réponse courte", "hintText": "Indice simple" },
                { "questionText": "Troisième question ?", "expectedAnswer": "Réponse courte", "hintText": "Indice simple" },
                { "questionText": "Quatrième question ?", "expectedAnswer": "Réponse courte", "hintText": "Indice simple" }
              ]
            }
            """.formatted(videoText, java.util.UUID.randomUUID().toString());

        System.out.println("--- [DEBUG] LLM PROMPT SENT (lang=" + lang + ") ---\n" + prompt + "\n--- END PROMPT ---");

        try {
            String rawJson = callLlm(prompt);
            return parseSummaryResponse(rawJson, description, title, lang);
        } catch (Exception e) {
            System.err.println("ERREUR CRITIQUE LLM : " + e.getMessage());
            return fallbackSummary(description, title, lang);
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  REAL LLM  —  analyzeResponse
    // ══════════════════════════════════════════════════════════════

    /**
     * Calls the LLM to intelligently analyse a patient's spoken answer.
     * Falls back to simple string matching if the LLM call fails.
     *
     * @param questionText  the question that was asked
     * @param expected      the expected correct answer
     * @param patientAnswer what the patient said
     * @param hintText      the hint for this question
     */
    private AnalysisResult analyzeResponse(String questionText, String expected,
                                           String patientAnswer, String hintText, String lang) {
        if (expected == null || patientAnswer == null) {
            return safeIncorrect(hintText, lang);
        }
        boolean isEn = "en".equals(lang);

        String prompt = isEn ? """
            You are helping a person with Alzheimer's. Always be kind.

            Analyze the patient's answer to this question.

            Question asked: %s
            Expected answer: %s
            Patient's answer: %s

            STRICT RULES:
            - Be kind and encouraging
            - Very simple sentences (max 12 words)
            - NEVER say "wrong", "bad", "error" or "incorrect"
            - Always encourage, even if the answer is wrong
            - status "correct" if the answer contains the right idea (even worded differently)
            - status "partial" if approximately right
            - status "incorrect" if really off
            - the hint should be a tiny clue, not the direct answer

            Return ONLY valid JSON, no text before or after:

            {
              "status": "correct | partial | incorrect",
              "feedback": "short gentle phrase",
              "hint": "small simple clue"
            }
            """.formatted(questionText, expected, patientAnswer)
        : """
            Tu aides une personne atteinte d'Alzheimer. Sois toujours bienveillant.

            Analyse la réponse du patient à cette question.

            Question posée : %s
            Réponse attendue : %s
            Réponse du patient : %s

            Règles STRICTES :
            - être bienveillant et encourageant
            - phrases très simples (maximum 12 mots)
            - ne JAMAIS dire "faux", "mauvais", "erreur" ou "incorrect"
            - encourager toujours, même si la réponse est mauvaise
            - status "correct" si la réponse contient l'idée juste (même formulée différemment)
            - status "partial" si la réponse est approximativement juste
            - status "incorrect" si la réponse est vraiment éloignée
            - le hint doit être un tout petit indice, pas la réponse directe

            Retourne UNIQUEMENT du JSON valide, sans aucun texte avant ou après :

            {
              "status": "correct | partial | incorrect",
              "feedback": "phrase douce et courte",
              "hint": "petit indice simple"
            }
            """.formatted(questionText, expected, patientAnswer);

        try {
            String rawJson = callLlm(prompt);
            return parseAnalysisResponse(rawJson, hintText);
        } catch (Exception e) {
            log.error("LLM analyzeResponse failed — using string matching fallback. Error: {}", e.getMessage());
            return strMatchFallback(expected, patientAnswer, hintText, lang);
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  HTTP CALL TO OPENROUTER
    // ══════════════════════════════════════════════════════════════

    /**
     * Sends a chat-completion request to OpenRouter and returns the model's reply text.
     * Uses Spring WebClient with a configurable timeout.
     */
    private String callLlm(String userPrompt) {
        // Build request body (OpenAI-compatible format)
        Map<String, Object> message = Map.of("role", "user", "content", userPrompt);
        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(message),
                "temperature", 0.4,          // low temperature = more deterministic / safer output
                "max_tokens", 1000,
                "response_format", Map.of("type", "json_object")  // enforce JSON output
        );

        WebClient client = WebClient.builder()
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader("HTTP-Referer", "https://alzheimer-therapy.local")
                .defaultHeader("X-Title", "Alzheimer Audio Session")
                .build();

        String response = client.post()
                .uri(apiUrl)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .block();

        // Extract the content field from OpenRouter's response envelope
        JsonNode root    = parseJson(response);
        JsonNode choices = root.path("choices");
        if (choices.isEmpty()) {
            throw new RuntimeException("LLM returned empty choices. Full response: " + response);
        }
        return choices.get(0).path("message").path("content").asText();
    }

    // ══════════════════════════════════════════════════════════════
    //  JSON PARSERS (strict with fallback)
    // ══════════════════════════════════════════════════════════════

    /**
     * Parses the LLM's JSON into a LlmResult (summary + questions).
     * If parsing fails at any point, falls back gracefully.
     */
    private LlmResult parseSummaryResponse(String rawJson, String description, String title, String lang) {
        try {
            String cleaned = stripCodeFences(rawJson);
            JsonNode node = parseJson(cleaned);

            List<String> summary  = new ArrayList<>();
            List<AudioQuestion> questions = new ArrayList<>();

            JsonNode summaryNode = node.path("summary");
            if (summaryNode.isArray()) {
                for (JsonNode s : summaryNode) {
                    String line = s.asText().trim();
                    if (!line.isEmpty()) summary.add(line);
                }
            }

            JsonNode questionsNode = node.path("questions");
            if (questionsNode.isArray()) {
                for (JsonNode q : questionsNode) {
                    String questionText  = q.path("questionText").asText("").trim();
                    String expectedAnswer = q.path("expectedAnswer").asText("").trim();
                    String hintText      = q.path("hintText").asText("").trim();
                    if (!questionText.isEmpty() && !expectedAnswer.isEmpty()) {
                        questions.add(buildQ(questionText, expectedAnswer, hintText));
                    }
                }
            }

            if (summary.isEmpty() || questions.isEmpty()) {
                log.warn("LLM response parsed but empty — falling back. Raw: {}", rawJson);
                return fallbackSummary(description, title, lang);
            }

            log.info("LLM generateSummaryAndQuestions succeeded: {} summary lines, {} questions",
                    summary.size(), questions.size());
            return new LlmResult(summary, questions);

        } catch (Exception e) {
            log.error("parseSummaryResponse failed: {}. Raw JSON was: {}", e.getMessage(), rawJson);
            return fallbackSummary(description, title, lang);
        }
    }

    /**
     * Parses the LLM's JSON into an AnalysisResult.
     * Falls back to string matching if parsing fails.
     */
    private AnalysisResult parseAnalysisResponse(String rawJson, String hintText) {
        try {
            String cleaned = stripCodeFences(rawJson);
            JsonNode node  = parseJson(cleaned);

            String status   = node.path("status").asText("incorrect").trim().toLowerCase();
            String feedback = node.path("feedback").asText("").trim();
            String hint     = node.path("hint").asText(hintText != null ? hintText : "").trim();

            // Validate status value
            if (!Set.of("correct", "partial", "incorrect", "silence").contains(status)) {
                status = "incorrect";
            }
            if (feedback.isEmpty()) {
                feedback = "Très bien ! Continuons.";
            }

            log.info("LLM analyzeResponse: status={}, feedback={}", status, feedback);
            return new AnalysisResult(status, feedback, hint);

        } catch (Exception e) {
            log.error("parseAnalysisResponse failed: {}. Raw: {}", e.getMessage(), rawJson);
            return safeIncorrect(hintText, "fr");
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  FALLBACKS (used when LLM is unavailable or returns bad JSON)
    // ══════════════════════════════════════════════════════════════

    /**
     * Smart fallback: keyword-based content detection.
     * Used when the LLM is unreachable or returns unparseable output.
     * MUCH better than the old generic "Cette vidéo était intéressante".
     */
    private LlmResult fallbackSummary(String description, String title, String lang) {
        String text  = normalize((description != null ? description : "") + " " + (title != null ? title : ""));
        boolean isEn = "en".equals(lang);
        List<String> summary   = new ArrayList<>();
        List<AudioQuestion> questions = new ArrayList<>();

        if (anyWord(text, "saison", "printemps", "ete", "hiver", "automne", "season", "spring", "summer", "winter", "autumn")) {
            summary.add(isEn ? "This video is about the four seasons." : "Cette vidéo parle des quatre saisons de l'année.");
            summary.add(isEn ? "There is spring, summer, autumn and winter." : "Il y a le printemps, l'été, l'automne et l'hiver.");
            summary.add(isEn ? "Each season brings different weather." : "Le temps change à chaque saison.");
            questions.add(buildQ(
                isEn ? "What season comes after winter?" : "Quelle saison vient après l'hiver ?",
                isEn ? "spring" : "printemps",
                isEn ? "It's when flowers bloom." : "C'est quand les fleurs poussent."));
            questions.add(buildQ(
                isEn ? "In which season is it the hottest?" : "En quelle saison fait-il le plus chaud ?",
                isEn ? "summer" : "été",
                isEn ? "It's the season for holidays." : "C'est le moment des vacances."));
            questions.add(buildQ(
                isEn ? "Which season comes before winter?" : "Quelle saison précède l'hiver ?",
                isEn ? "autumn" : "automne",
                isEn ? "Leaves fall during this season." : "Les feuilles tombent à cette saison."));
            questions.add(buildQ(
                isEn ? "How many seasons are there in a year?" : "Combien y a-t-il de saisons dans une année ?",
                isEn ? "four" : "quatre",
                isEn ? "Count them: spring, summer, autumn, winter." : "Comptez-les : printemps, été, automne, hiver."));

        } else if (anyWord(text, "jour", "semaine", "lundi", "day", "week", "monday")) {
            summary.add(isEn ? "This video talks about the days of the week." : "Cette vidéo parle des jours de la semaine.");
            summary.add(isEn ? "There are seven days in a week." : "Il y a sept jours dans une semaine.");
            summary.add(isEn ? "The week often starts on Monday." : "On commence souvent la semaine par le lundi.");
            questions.add(buildQ(
                isEn ? "What is the first day of the week?" : "Quel est le premier jour de la semaine ?",
                isEn ? "monday" : "lundi",
                isEn ? "It's the start of the work week." : "C'est souvent le jour du retour au travail."));
            questions.add(buildQ(
                isEn ? "How many days are in a week?" : "Combien y a-t-il de jours dans une semaine ?",
                isEn ? "seven" : "sept",
                isEn ? "Count from Monday to Sunday." : "Comptez de lundi à dimanche."));
            questions.add(buildQ(
                isEn ? "What day comes after Friday?" : "Quel jour vient après le vendredi ?",
                isEn ? "saturday" : "samedi",
                isEn ? "It's the start of the weekend." : "C'est le début du week-end."));
            questions.add(buildQ(
                isEn ? "Which day is the last of the week?" : "Quel est le dernier jour de la semaine ?",
                isEn ? "sunday" : "dimanche",
                isEn ? "It's a day for rest." : "C'est un jour de repos."));

        } else if (anyWord(text, "famille", "family", "parent", "mother", "father")) {
            summary.add(isEn ? "This video is about family and loved ones." : "Cette vidéo parle de la famille et des proches.");
            summary.add(isEn ? "Family is made of people who love each other." : "La famille est composée de personnes qui s'aiment.");
            summary.add(isEn ? "There are parents, children and grandparents." : "Il y a des parents, des enfants et des grands-parents.");
            questions.add(buildQ(
                isEn ? "Who are your parents' parents?" : "Qui sont les parents de vos parents ?",
                isEn ? "grandparents" : "grands-parents",
                isEn ? "They often tell wonderful stories." : "Ils sont souvent très gentils."));
            questions.add(buildQ(
                isEn ? "Who takes care of young children?" : "Qui s'occupe des jeunes enfants ?",
                isEn ? "parents" : "les parents",
                isEn ? "They are the mother and father." : "Ce sont la maman et le papa."));
            questions.add(buildQ(
                isEn ? "What do we call the children of your brothers or sisters?" : "Comment appelle-t-on les enfants de vos frères ou sœurs ?",
                isEn ? "nephews and nieces" : "neveux et nièces",
                isEn ? "They call you uncle or aunt." : "Ils vous appellent oncle ou tante."));
            questions.add(buildQ(
                isEn ? "Is family important?" : "La famille est-elle importante ?",
                isEn ? "yes" : "oui",
                isEn ? "Think about the people you love." : "Pensez aux gens que vous aimez."));

        } else {
            String topic = (title != null && !title.isBlank()) ? title : (isEn ? "this topic" : "ce sujet");
            summary.add(isEn ? "This video is about " + topic + "." : "Cette vidéo nous parle de " + topic + ".");
            summary.add(isEn ? "Let's explore some details." : "Nous allons explorer quelques détails.");
            summary.add(isEn ? "Answer at your own pace." : "Répondez à votre rythme.");
            
            questions.add(buildQ(
                isEn ? "What is the main topic we are discussing?" : "De quel grand sujet parlons-nous ?",
                (title != null && !title.isBlank()) ? title.toLowerCase() : "sujet",
                isEn ? "Think about the main theme." : "Pensez au thème principal."));
            questions.add(buildQ(
                isEn ? "What color is usually associated with this topic?" : "Quelle est la caractéristique principale de ce sujet ?",
                isEn ? "details" : "détails",
                isEn ? "Just say what first comes to mind." : "Dites la première chose qui vous vient à l'esprit."));
            questions.add(buildQ(
                isEn ? "Where can you usually find this?" : "Où peut-on généralement trouver cela ?",
                isEn ? "everywhere" : "partout",
                isEn ? "Think about familiar places." : "Pensez à des endroits familiers."));
            questions.add(buildQ(
                isEn ? "Can you name one famous example?" : "Pouvez-vous citer un exemple connu ?",
                isEn ? "example" : "exemple",
                isEn ? "Any example is fine." : "N'importe quel exemple est bon."));
        }

        return new LlmResult(summary, questions);
    }

    /** Simple string-matching fallback for analyzeResponse */
    private AnalysisResult strMatchFallback(String expected, String patientAnswer, String hintText, String lang) {
        String expN = normalize(expected);
        String patN = normalize(patientAnswer);
        boolean isEn = "en".equals(lang);

        if (patN.contains(expN) || expN.contains(patN)) {
            return new AnalysisResult("correct", isEn ? "Well done! That's exactly it!" : "Très bien ! C'est exactement ça !", "");
        }
        String[] expWords = expN.split("\\s+");
        String[] patWords = patN.split("\\s+");
        boolean anyMatch  = Arrays.stream(expWords)
                .filter(w -> w.length() > 2)
                .anyMatch(w -> Arrays.asList(patWords).contains(w));

        if (anyMatch) {
            return new AnalysisResult("partial",
                    isEn ? "Almost! You're on the right track." : "Presque ! Vous êtes sur la bonne voie.",
                    hintText != null ? hintText : "");
        }
        return safeIncorrect(hintText, lang);
    }

    private AnalysisResult safeIncorrect(String hintText, String lang) {
        boolean isEn = "en".equals(lang);
        return new AnalysisResult("incorrect",
                isEn ? "That's okay. Take your time." : "Ce n'est pas grave. Prenez votre temps.",
                hintText != null ? hintText : "");
    }

    // ══════════════════════════════════════════════════════════════
    //  HELPERS
    // ══════════════════════════════════════════════════════════════

    private AudioSession getOrThrow(String id) {
        return audioSessionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("AudioSession not found: " + id));
    }

    private void calculateAndSetScores(AudioSession session) {
        int correct = 0;
        int partial = 0;
        int incorrect = 0;
        
        for (AudioQuestion q : session.getQuestions()) {
            if (q.isCompleted()) {
                if ("correct".equals(q.getAnalysisStatus())) {
                    correct++;
                } else if ("partial".equals(q.getAnalysisStatus())) {
                    partial++;
                } else {
                    // if it's incorrect, silence, or anything else and we forced moveOn, count as incorrect.
                    incorrect++;
                }
            }
        }
        
        session.setCorrectAnswers(correct);
        session.setPartialAnswers(partial);
        session.setIncorrectAnswers(incorrect);
    }

    private ProcessAnswerResponse finaliseSession(AudioSession session) {
        calculateAndSetScores(session);
        String lang = session.getLanguage() != null ? session.getLanguage() : "fr";
        boolean isEn = "en".equals(lang);
        session.setSessionStatus("COMPLETED");
        session.setUpdatedAt(LocalDateTime.now());

        List<String> finalSummaryLines = new ArrayList<>();
        finalSummaryLines.add(isEn ? "Well done, our exercise is complete!" : "Voilà, nous avons terminé notre exercice !");
        finalSummaryLines.add(isEn ? "Let me remind you of the key points." : "Je vais vous rappeler les points importants.");
        finalSummaryLines.addAll(session.getSummary());
        finalSummaryLines.add(isEn ? "Great participation. You did very well!" : "Bravo pour votre participation. Vous avez très bien travaillé !");

        session.setFinalSummary(String.join(" ", finalSummaryLines));
        finalSummaryLines.forEach(line -> appendExchange(session, "AI", line));
        audioSessionRepository.save(session);

        return ProcessAnswerResponse.builder()
                .status("completed")
                .feedback(isEn ? "Great participation. You did very well!" : "Bravo pour votre participation. Vous avez très bien travaillé !")
                .sessionFinished(true)
                .finalSummary(finalSummaryLines)
                .currentQuestionIndex(session.getCurrentQuestionIndex())
                .totalQuestions(session.getTotalQuestions())
                .correctAnswers(session.getCorrectAnswers())
                .partialAnswers(session.getPartialAnswers())
                .incorrectAnswers(session.getIncorrectAnswers())
                .build();
    }

    private ProcessAnswerResponse buildFinishedResponse(AudioSession session) {
        calculateAndSetScores(session);
        return ProcessAnswerResponse.builder()
                .status("completed")
                .feedback("La séance est déjà terminée. Merci !")
                .sessionFinished(true)
                .finalSummary(session.getSummary())
                .currentQuestionIndex(session.getCurrentQuestionIndex())
                .totalQuestions(session.getTotalQuestions())
                .correctAnswers(session.getCorrectAnswers())
                .partialAnswers(session.getPartialAnswers())
                .incorrectAnswers(session.getIncorrectAnswers())
                .build();
    }

    private void appendExchange(AudioSession session, String speaker, String text) {
        session.getTranscriptHistory().add(
                AudioExchange.builder().speaker(speaker).text(text).build());
    }

    private AudioQuestion buildQ(String question, String expected, String hint) {
        return AudioQuestion.builder()
                .questionText(question)
                .expectedAnswer(expected)
                .hintText(hint)
                .build();
    }

    /** Normalise: lowercase, remove accents, remove punctuation */
    private String normalize(String s) {
        if (s == null) return "";
        return java.text.Normalizer.normalize(s.toLowerCase().trim(), java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .replaceAll("[^a-z0-9\\s]", "");
    }

    private String buildVideoText(String description, String title, String transcript) {
        StringBuilder sb = new StringBuilder();

        if (transcript != null && !transcript.isBlank()) {
            sb.append("[!!! SOURCE PRIORITAIRE : TRANSCRIPTION AUDIO !!!]\n");
            sb.append(transcript.trim()).append("\n\n");
        } else {
            sb.append("[!!! ATTENTION : TRANSCRIPTION ABSENTE. NE PAS INVENTER DE FAITS !!!]\n\n");
        }
        
        if (description != null && !description.isBlank()) {
            sb.append("[SOURCE SECONDAIRE : DESCRIPTION DESCRIPTIVE]\n");
            sb.append(description.trim()).append("\n\n");
        }

        if (title != null && !title.isBlank()) {
            sb.append("[CONTEXTE : TITRE DE LA VIDÉO]\n");
            sb.append(title.trim()).append("\n");
        }

        if (sb.length() < 100 && (transcript == null || transcript.isBlank())) {
            sb.append("\nNOTE AU MODÈLE : Le contenu est très pauvre. Pose une question générale sur le thème du titre.");
        }

        return sb.toString().trim();
    }

    /** True if the normalised text contains any of the given keywords */
    private boolean anyWord(String normText, String... words) {
        return Arrays.stream(words).anyMatch(normText::contains);
    }

    private JsonNode parseJson(String text) {
        try {
            return objectMapper.readTree(text);
        } catch (Exception e) {
            throw new RuntimeException("JSON parse error: " + e.getMessage() + " | text=" + text);
        }
    }

    /** Removes ```json ... ``` or ``` ... ``` code fences that some models add */
    private String stripCodeFences(String text) {
        if (text == null) return "";
        return text.replaceAll("(?s)```(?:json)?\\s*", "").trim();
    }

    // ══════════════════════════════════════════════════════════════
    //  INTERNAL RESULT RECORDS
    // ══════════════════════════════════════════════════════════════

    private record LlmResult(List<String> summary, List<AudioQuestion> questions) {}

    private record AnalysisResult(String status, String feedback, String hint) {}
}
