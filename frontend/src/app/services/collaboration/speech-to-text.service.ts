import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { GuidanceService } from './guidance.service';

/**
 * Structured commands parsed from a patient's voice input.
 * Used by the messenger component to navigate and send messages by voice.
 */
export type SttCommand =
  | { type: 'OPEN_GROUP';   groupName: string }
  | { type: 'OPEN_DM';      personName: string }
  | { type: 'SEND_MESSAGE'; text: string }
  | { type: 'GO_TO_FEED' }
  | { type: 'GO_TO_GROUPS' }
  | { type: 'GO_TO_MESSAGES' }
  | { type: 'GO_TO_DOCTOR' }
  | { type: 'STOP_VOICE' }
  | { type: 'REPEAT' }
  | { type: 'UNKNOWN';      raw: string };

/**
 * Angular service for speech-to-text (voice input) functionality.
 * Uses the browser's Web Speech API. Supported in Chrome, Edge, Safari.
 */
@Injectable({ providedIn: 'root' })
export class SpeechToTextService {
  private platformId = inject(PLATFORM_ID);
  private guidance   = inject(GuidanceService);

  /** True while the microphone is actively listening */
  isListening = signal<boolean>(false);

  /** The last transcript received from the microphone */
  lastTranscript = signal<string>('');

  /** The last parsed command (for debugging) */
  lastCommand    = signal<SttCommand | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private recognition: any = null;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'en-US';
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
      }
    }
  }

  /** Returns true if the browser supports speech recognition */
  get isSupported(): boolean {
    return !!this.recognition;
  }

  askAndListen(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject('Speech recognition not supported');
        return;
      }

      if (prompt) this.guidance.speakImmediate(prompt);

      const waitForSpeech = () => {
        if (this.guidance.isSpeaking()) {
          setTimeout(waitForSpeech, 200);
          return;
        }
        this.startListening(resolve, reject);
      };
      setTimeout(waitForSpeech, 300);
    });
  }

  private startListening(
    resolve: (v: string) => void,
    reject: (r: string) => void
  ) {
    this.isListening.set(true);

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.trim();
      this.lastTranscript.set(transcript);
      this.isListening.set(false);
      resolve(transcript);
    };

    this.recognition.onerror = (event: any) => {
      this.isListening.set(false);
      reject(event.error);
    };

    this.recognition.onend = () => {
      this.isListening.set(false);
    };

    try {
      this.recognition.start();
    } catch {
      this.isListening.set(false);
      reject('Could not start recognition');
    }
  }

  /** Stops the microphone if it's currently listening */
  stopListening() {
    if (this.recognition) {
      try { this.recognition.stop(); } catch { /* ignore */ }
    }
    this.isListening.set(false);
  }

  async listenForIntent(pageName: string, prompt = ''): Promise<void> {
    try {
      const utterance = await this.askAndListen(prompt);
      if (utterance?.trim()) {
        await this.guidance.sendIntent(utterance.trim(), pageName);
      }
    } catch {
      this.guidance.speakImmediate('Sorry, I could not hear you. Please try again.');
    }
  }

  parseCommand(raw: string, groupNames: string[], peopleNames: string[]): SttCommand {
    const lower = raw.toLowerCase();

    if (lower.includes('stop') || lower.includes('quiet') || lower.includes('silence')) {
      return { type: 'STOP_VOICE' };
    }
    if (lower.includes('repeat') || lower.includes('again') || lower.includes('say again')) {
      return { type: 'REPEAT' };
    }
    if (lower.includes('feed') || lower.includes('home') || lower.includes('posts')) {
      return { type: 'GO_TO_FEED' };
    }
    if (lower.includes('group') && (lower.includes('list') || lower.includes('communities'))) {
      return { type: 'GO_TO_GROUPS' };
    }

    for (const name of groupNames) {
      if (lower.includes(name.toLowerCase())) {
        return { type: 'OPEN_GROUP', groupName: name };
      }
    }

    for (const name of peopleNames) {
      const firstName = name.split(' ')[0].toLowerCase();
      if (lower.includes(firstName)) {
        return { type: 'OPEN_DM', personName: name };
      }
    }

    const sendMatch = lower.match(/^(?:send|write|say|tell them)\s+(.+)$/);
    if (sendMatch) {
      return { type: 'SEND_MESSAGE', text: sendMatch[1] };
    }

    return { type: 'UNKNOWN', raw };
  }
}
