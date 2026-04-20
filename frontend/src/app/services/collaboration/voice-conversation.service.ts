import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { GuidanceService } from './guidance.service';
import { SpeechToTextService } from './speech-to-text.service';

export interface ConversationAction {
  label: string;
  keyword: string[];
  callback: () => void;
}

export interface ConversationTurn {
  question: string;
  actions: ConversationAction[];
  allowFreeText?: boolean;
  freeTextCallback?: (text: string) => void;
  timeoutMs?: number;
}

@Injectable({ providedIn: 'root' })
export class VoiceConversationService {
  private guidance = inject(GuidanceService);
  private stt      = inject(SpeechToTextService);
  private platformId = inject(PLATFORM_ID);

  /** The currently active conversation turn — null when no conversation is in progress */
  activeTurn = signal<ConversationTurn | null>(null);

  /** True while the microphone is listening for the patient's response */
  isListening = signal<boolean>(false);

  private dismissTimer: ReturnType<typeof setTimeout> | null = null;

  ask(turn: ConversationTurn) {
    if (!isPlatformBrowser(this.platformId)) return;

    this.clearDismissTimer();
    this.activeTurn.set(turn);

    this.guidance.speakImmediate(turn.question);

    const waitAndListen = () => {
      if (this.guidance.isSpeaking()) {
        setTimeout(waitAndListen, 200);
        return;
      }
      if (!this.stt.isSupported) return; // UI buttons only — no mic

      this.isListening.set(true);
      this.stt.askAndListen('').then(transcript => {
        this.isListening.set(false);
        this.handleVoiceAnswer(transcript, turn);
      }).catch(() => {
        this.isListening.set(false);
      });
    };

    setTimeout(waitAndListen, 400);

    const timeout = turn.timeoutMs ?? 15000;
    this.dismissTimer = setTimeout(() => this.dismiss(), timeout);
  }

  selectAction(action: ConversationAction) {
    this.stt.stopListening();
    this.clearDismissTimer();
    this.activeTurn.set(null);
    this.isListening.set(false);
    action.callback();
  }

  /** Dismisses the overlay without taking any action (called on timeout or skip button) */
  dismiss() {
    this.stt.stopListening();
    this.clearDismissTimer();
    this.activeTurn.set(null);
    this.isListening.set(false);
  }

  private handleVoiceAnswer(transcript: string, turn: ConversationTurn) {
    this.clearDismissTimer();
    this.activeTurn.set(null);

    const lower = transcript.toLowerCase().trim();

    for (const action of turn.actions) {
      if (action.keyword.some(k => lower.includes(k))) {
        action.callback();
        return;
      }
    }

    if (turn.allowFreeText && turn.freeTextCallback) {
      turn.freeTextCallback(transcript);
      return;
    }

    this.guidance.speakImmediate(`I did not understand. You said: ${transcript}. Please try again or tap a button.`);
  }

  private clearDismissTimer() {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
  }
}
