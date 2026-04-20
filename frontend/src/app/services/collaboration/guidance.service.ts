import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface GuidanceResponseDto {
  pageName: string;
  pageLabel: string;
  instructions: string[];
  fullScript: string;
}

export interface VoiceAssistantResponse {
  /** The spoken sentence for TTS */
  text: string;
  /** Full tool call string, e.g. MapsTo("messages") — present only for agentic responses */
  action?: string;
  /** Tool name without arguments, e.g. "MapsTo" */
  tool?: string;
}

export interface VoicePromptRequest {
  targetPatientId: number;
  message: string;
  caregiverId: number;
}

@Injectable({ providedIn: 'root' })
export class GuidanceService {
  private http          = inject(HttpClient);
  private platformId    = inject(PLATFORM_ID);
  private baseUrl       = 'http://localhost:8081/api/guidance';
  private aiUrl         = 'http://localhost:8081/api/voice-assistant/describe';

  // ── Public signals ────────────────────────────────────────────────────────
  currentGuidance  = signal<GuidanceResponseDto | null>(null);
  isSpeaking       = signal<boolean>(false);
  voiceUnlocked    = signal<boolean>(false);
  /** null = not decided yet, true = opted in, false = opted out */
  voiceOptIn       = signal<boolean | null>(null);
  showWelcomeOverlay = signal<boolean>(false);

  toolDispatcher: ((tool: string, args: string[]) => void) | null = null;

  // ── Internal queue ────────────────────────────────────────────────────────
  private queue: string[]  = [];
  private speaking         = false;
  /** Debounce timer for hover — avoids spamming AI on fast mouse moves */
  private hoverTimer: ReturnType<typeof setTimeout> | null = null;
  /** Cache: key = contextType+contextData, value = spoken sentence */
  private describeCache    = new Map<string, string>();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem('voice_opt_in');
      if (stored === 'true') {
        this.voiceOptIn.set(true);
        this.voiceUnlocked.set(true);
      } else if (stored === 'false') {
        this.voiceOptIn.set(false);
      } else {
        this.showWelcomeOverlay.set(true);
      }
    }
  }

  // ── Opt-in / Opt-out ─────────────────────────────────────────────────────

  /** User chose YES — enable voice for this and all future sessions */
  enableVoice() {
    this.voiceOptIn.set(true);
    this.voiceUnlocked.set(true);
    this.showWelcomeOverlay.set(false);
    localStorage.setItem('voice_opt_in', 'true');
    this.drainQueue();
  }

  /** User chose NO — disable voice, remember the choice */
  disableVoice() {
    this.voiceOptIn.set(false);
    this.voiceUnlocked.set(false);
    this.showWelcomeOverlay.set(false);
    localStorage.setItem('voice_opt_in', 'false');
    this.queue = [];
  }

  /** Toggle from the Read Aloud button — flips the current opt-in state */
  toggleVoice() {
    if (this.voiceOptIn() === false || !this.voiceUnlocked()) {
      this.enableVoice();
    } else {
      this.disableVoice();
    }
  }

  // ── Unlock (kept for backward compat) ────────────────────────────────────
  unlock() {
    this.enableVoice();
  }

  // ── AI-powered describe ───────────────────────────────────────────────────

  async describe(
    contextType: string,
    contextData: string,
    pageName: string,
    immediate = false
  ): Promise<void> {
    if (!this.voiceUnlocked() || !contextData?.trim()) return;

    const cacheKey = `${contextType}::${contextData.substring(0, 80)}`;
    let text = this.describeCache.get(cacheKey);
    let action: string | undefined;
    let tool: string | undefined;

    if (!text) {
      try {
        const res = await firstValueFrom(
          this.http.post<VoiceAssistantResponse>(this.aiUrl, { contextType, contextData, pageName })
        );
        text   = res.text;
        action = res.action;
        tool   = res.tool;
        if (contextType !== 'intent' && contextType !== 'conversation') {
          this.describeCache.set(cacheKey, text);
        }
      } catch {
        text = contextData.substring(0, 80);
      }
    }

    if (action && tool && this.toolDispatcher) {
      const args = this.parseToolArgs(action);
      this.toolDispatcher(tool, args);
    }

    if (immediate) {
      this.speakImmediate(text!);
    } else {
      this.enqueue(text!);
    }
  }

  async sendIntent(userUtterance: string, pageName: string): Promise<void> {
    return this.describe('intent', userUtterance, pageName, true);
  }

  private parseToolArgs(toolCall: string): string[] {
    const match = toolCall.match(/\(([^)]*)\)/);
    if (!match) return [];
    return match[1]
      .split(',')
      .map(s => s.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, ''));
  }

  describeOnHover(contextType: string, contextData: string, pageName: string) {
    if (this.hoverTimer) clearTimeout(this.hoverTimer);
    this.hoverTimer = setTimeout(() => {
      this.describe(contextType, contextData, pageName, true);
    }, 500);
  }

  cancelHover() {
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
  }

  // ── Page guidance ─────────────────────────────────────────────────────────

  loadAndSpeak(pageName: string) {
    if (!isPlatformBrowser(this.platformId)) return;
    this.describe('page', pageName, pageName);
    this.http.get<GuidanceResponseDto>(`${this.baseUrl}/${pageName}`).subscribe(data => {
      this.currentGuidance.set(data);
    });
  }

  loadGuidance(pageName: string) {
    this.http.get<GuidanceResponseDto>(`${this.baseUrl}/${pageName}`).subscribe(data => {
      this.currentGuidance.set(data);
    });
  }

  speakCurrentPage() {
    const g = this.currentGuidance();
    if (g) this.enqueue(g.fullScript);
  }

  // ── Notification reader ───────────────────────────────────────────────────

  speakNotification(content: string, _type?: string) {
    if (!content) return;
    this.describe('notification', content, 'notifications');
  }

  // ── Message reader ────────────────────────────────────────────────────────

  speakIncomingMessage(senderName: string, content: string) {
    if (!content) return;
    this.describe('message', `${senderName} says: ${content}`, 'messenger');
  }

  // ── Feed posts ────────────────────────────────────────────────────────────

  speakFeedPosts(posts: Array<{ authorName: string; content: string }>) {
    if (!posts.length) return;
    const first = posts[0];
    this.describe('post', `${first.authorName}: ${first.content}`, 'feed');
    posts.slice(1, 3).forEach(p => {
      this.enqueue(`${p.authorName} wrote: ${p.content?.substring(0, 80) || 'shared a post'}.`);
    });
  }

  // ── Generic speak ─────────────────────────────────────────────────────────

  speak(text: string) {
    this.enqueue(text);
  }

  speakImmediate(text: string) {
    if (!text?.trim() || !this.voiceUnlocked()) return;
    if (!isPlatformBrowser(this.platformId) || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    this.queue   = [];
    this.speaking = false;
    this.isSpeaking.set(false);
    setTimeout(() => this.enqueue(text), 80);
  }

  stopSpeaking() {
    if (isPlatformBrowser(this.platformId) && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.queue    = [];
    this.speaking = false;
    this.isSpeaking.set(false);
  }

  // ── Queue engine ──────────────────────────────────────────────────────────

  private enqueue(text: string) {
    if (!text?.trim()) return;
    this.queue.push(text.trim());
    if (this.voiceUnlocked()) this.drainQueue();
  }

  private drainQueue() {
    if (this.speaking || !this.queue.length) return;
    if (!isPlatformBrowser(this.platformId) || !('speechSynthesis' in window)) return;

    this.speaking = true;
    this.isSpeaking.set(true);

    const next = this.queue.shift()!;
    const u    = new SpeechSynthesisUtterance(next);
    u.lang     = 'en-US';
    u.rate     = 0.85;
    u.pitch    = 1.0;
    u.volume   = 1.0;

    u.onend = () => {
      this.speaking = false;
      if (this.queue.length > 0) {
        setTimeout(() => this.drainQueue(), 500);
      } else {
        this.isSpeaking.set(false);
      }
    };
    u.onerror = () => {
      this.speaking = false;
      this.isSpeaking.set(false);
    };

    window.speechSynthesis.speak(u);
  }

  // ── REST helpers ──────────────────────────────────────────────────────────

  simplify(text: string) {
    return this.http.post<{ simplified: string }>(`${this.baseUrl}/simplify`, { text });
  }

  sendVoicePrompt(request: VoicePromptRequest) {
    return this.http.post<{ status: string }>(`${this.baseUrl}/voice-prompt`, request);
  }

  upsertGuidance(pageName: string, instructions: string[], pageLabel: string, caregiverId: number) {
    return this.http.put<GuidanceResponseDto>(`${this.baseUrl}/${pageName}`, { instructions, pageLabel, caregiverId });
  }

  deleteGuidance(pageName: string, caregiverId: number) {
    return this.http.delete(`${this.baseUrl}/${pageName}`, { params: { caregiverId: caregiverId.toString() } });
  }
}
