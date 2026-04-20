import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InitSessionResponse {
  sessionId: string;
  summary: string[];
  firstQuestion: string;
  totalQuestions: number;
}

export interface ProcessAnswerResponse {
  status: string;           // correct | partial | incorrect | silence | repeat | stopped | completed
  feedback: string;
  hint: string;
  nextQuestion: string | null;
  sessionFinished: boolean;
  finalSummary: string[];
  currentQuestionIndex: number;
  totalQuestions: number;
  correctAnswers: number;
  partialAnswers: number;
  incorrectAnswers: number;
}

@Injectable({ providedIn: 'root' })
export class AudioSessionService {

  private readonly baseUrl = `http://localhost:8085/api/audio-sessions`;

  // ── SpeechSynthesis ──────────────────────────────────────────────
  private synth: SpeechSynthesis = window.speechSynthesis;

  // ── SpeechRecognition ────────────────────────────────────────────
  private hardTimer: any = null;          // global max-duration guard
  private activeRecognition: any = null;  // current recognition instance

  /** Currently selected language locale (fr-FR or en-US) */
  private langLocale = 'fr-FR';

  setLanguage(lang: 'fr' | 'en'): void {
    this.langLocale = lang === 'en' ? 'en-US' : 'fr-FR';
  }

  constructor(private http: HttpClient) {}

  // ══════════════════════════════════════════════════════════════
  //  HTTP CALLS
  // ══════════════════════════════════════════════════════════════

  initSession(
    activityId: string,
    patientId: string,
    activityDescription: string,
    activityTitle: string,
    videoUrl: string = '',
    language: 'fr' | 'en' = 'fr'
  ): Observable<InitSessionResponse> {
    this.setLanguage(language);
    return this.http.post<InitSessionResponse>(`${this.baseUrl}/init`, {
      activityId, patientId, activityDescription, activityTitle, videoUrl, language
    });
  }

  processAnswer(sessionId: string, answerText: string): Observable<ProcessAnswerResponse> {
    return this.http.post<ProcessAnswerResponse>(
      `${this.baseUrl}/${sessionId}/process-answer`, { answerText }
    );
  }

  repeatQuestion(sessionId: string): Observable<ProcessAnswerResponse> {
    return this.http.post<ProcessAnswerResponse>(`${this.baseUrl}/${sessionId}/repeat`, {});
  }

  stopSession(sessionId: string): Observable<ProcessAnswerResponse> {
    return this.http.post<ProcessAnswerResponse>(`${this.baseUrl}/${sessionId}/stop`, {});
  }

  // ══════════════════════════════════════════════════════════════
  //  TEXT-TO-SPEECH
  // ══════════════════════════════════════════════════════════════

  speak(text: string): Promise<void> {
    return new Promise((resolve) => {
      this.synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang   = this.langLocale;
      utterance.rate   = 0.78;
      utterance.pitch  = 1.05;
      utterance.volume = 1.0;

      const voices = this.synth.getVoices();
      const preferred = voices.find(v => v.lang.startsWith(this.langLocale.split('-')[0]));
      if (preferred) utterance.voice = preferred;

      utterance.onend   = () => resolve();
      utterance.onerror = () => resolve();

      this.synth.speak(utterance);
    });
  }

  async speakAll(sentences: string[], pauseMs = 1200): Promise<void> {
    for (const sentence of sentences) {
      await this.speak(sentence);
      await this.pause(pauseMs);
    }
  }

  stopSpeaking(): void {
    this.synth.cancel();
  }

  // ══════════════════════════════════════════════════════════════
  //  SPEECH-TO-TEXT  (microphone)
  // ══════════════════════════════════════════════════════════════

  /**
   * Listens for patient speech for up to `maxDurationMs` milliseconds.
   *
   * KEY DESIGN — auto-restart loop:
   * Chrome/Edge stop SpeechRecognition after ~5-7 s of internal silence even
   * with continuous=false. This fires onerror('no-speech') or onend without
   * a result. Instead of giving up, we immediately restart a new recognition
   * instance and keep looping until either:
   *   (a) the patient speaks    → onresult fires → done with transcript
   *   (b) the global hard timer → done with '' (silence)
   *
   * This gives the patient the FULL maxDurationMs to start speaking,
   * automatically re-opening the mic each time Chrome closes it early.
   */
  listen(maxDurationMs = 30000): Promise<string> {
    return new Promise((resolve) => {
      const SpeechRecognitionCtor =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognitionCtor) {
        this.hardTimer = setTimeout(() => resolve(''), maxDurationMs);
        return;
      }

      const startTime = Date.now();
      let resolved    = false;

      /** Called once — resolves the promise and cleans up */
      const done = (transcript: string) => {
        if (resolved) return;
        resolved = true;
        this.clearHardTimer();
        try { this.activeRecognition?.stop(); } catch (_) {}
        this.activeRecognition = null;
        resolve(transcript.trim());
      };

      // Hard global timeout — patient had their chance
      this.clearHardTimer();
      this.hardTimer = setTimeout(() => done(''), maxDurationMs);

      /** Starts (or restarts) a fresh SpeechRecognition instance */
      const startRec = () => {
        if (resolved) return;

        // Don't restart if we've already used up the allotted time
        if (Date.now() - startTime >= maxDurationMs) {
          done('');
          return;
        }

        const rec = new SpeechRecognitionCtor();
        this.activeRecognition = rec;

        rec.lang            = this.langLocale;
        rec.continuous      = false;   // Most reliable across browsers
        rec.interimResults  = false;
        rec.maxAlternatives = 1;

        // ── Patient spoke ─────────────────────────────────────
        rec.onresult = (event: any) => {
          let transcript = '';
          for (let i = 0; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              transcript += event.results[i][0].transcript + ' ';
            }
          }
          if (transcript.trim()) {
            done(transcript);
          }
          // If result was empty (shouldn't happen) let onend or restart handle it
        };

        // ── Chrome cut the mic early ──────────────────────────
        rec.onerror = (event: any) => {
          if (event.error === 'no-speech') {
            // Normal: Chrome heard nothing → restart mic immediately.
            // MUST NOT call startRec() here because onend fires immediately after onerror.
            // Calling it here causes an infinite loop of overlapping instances that breaks the mic.
            return;
          }
          if (event.error === 'aborted') {
            // We called stop() ourselves — ignore
            return;
          }
          // Any other error (not-allowed, network…) → give up
          done('');
        };

        // ── Recognition ended without a result → restart ──────
        rec.onend = () => {
          if (!resolved) startRec();
        };

        try {
          rec.start();
        } catch (e) {
          // start() can throw if called right after another stop()
          // Small delay avoids that race condition
          setTimeout(() => { if (!resolved) startRec(); }, 200);
        }
      };

      // Kick off the first attempt
      startRec();
    });
  }

  stopListening(): void {
    this.clearHardTimer();
    try { this.activeRecognition?.stop(); } catch (_) {}
    this.activeRecognition = null;
  }

  // ══════════════════════════════════════════════════════════════
  //  UTILITY
  // ══════════════════════════════════════════════════════════════

  stopAll(): void {
    this.stopSpeaking();
    this.stopListening();
  }

  private clearHardTimer(): void {
    if (this.hardTimer) {
      clearTimeout(this.hardTimer);
      this.hardTimer = null;
    }
  }

  private pause(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isSpeechRecognitionSupported(): boolean {
    return !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
  }
}
