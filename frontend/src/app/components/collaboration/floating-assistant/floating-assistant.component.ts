import { Component, OnInit, OnDestroy, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

import { GuidanceService } from '../../../services/collaboration/guidance.service';
import { SpeechToTextService } from '../../../services/collaboration/speech-to-text.service';
import { AuthService } from '../../../services/auth.service';

/**
 * FloatingAssistantComponent — the global "Talk to Brain" button.
 *
 * Placed once in app.component.html (outside the router-outlet).
 * Only visible to PATIENT users.
 *
 * What it does:
 *   1. Registers guidance.toolDispatcher — so when Gemini returns
 *      MapsTo("messages"), the router navigates immediately.
 *   2. On mic press → calls stt.listenForIntent(currentPage) which:
 *        a. Opens the mic
 *        b. Sends the utterance to Gemini via guidance.sendIntent()
 *        c. Gemini returns a tool call + spoken sentence
 *        d. toolDispatcher fires the correct Angular action
 *        e. TTS speaks the confirmation
 *
 * Supported tool dispatches:
 *   MapsTo("messages")      → router.navigate(['/collaboration/messenger'])
 *   MapsTo("home")          → router.navigate(['/collaboration/feed'])
 *   MapsTo("groups")        → router.navigate(['/collaboration/groups'])
 *   MapsTo("doctor_list")   → router.navigate(['/contact-doctor'])
 *   MapsTo("profile")       → router.navigate(['/patient-dashboard'])
 *   MapsTo("notifications") → router.navigate(['/collaboration/feed'])
 *   sendMessage("Name","txt")→ opens messenger to that contact
 *   getAppContext()         → reads currentPage and describes it
 */
@Component({
  selector: 'app-floating-assistant',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fab-wrapper" *ngIf="isPatient && guidance.voiceOptIn() === true">

      <!-- Mic button -->
      <button
        id="brain-mic-btn"
        class="fab-mic"
        [class.listening]="stt.isListening()"
        [class.speaking]="guidance.isSpeaking()"
        (click)="onMicClick()"
        [disabled]="stt.isListening() || guidance.isSpeaking()"
        aria-label="Talk to your assistant"
        title="Tap and talk — I'm here to help">

        <span class="fab-ring"></span>
        <i class="fa-solid"
           [class.fa-microphone]="!guidance.isSpeaking()"
           [class.fa-volume-high]="guidance.isSpeaking()">
        </i>
      </button>

      <!-- Status label -->
      <div class="fab-label" *ngIf="stt.isListening()">Listening…</div>
      <div class="fab-label speaking-label" *ngIf="guidance.isSpeaking() && !stt.isListening()">Speaking…</div>
    </div>
  `,
  styles: [`
    .fab-wrapper {
      position: fixed;
      bottom: 28px;
      right: 28px;
      z-index: 9000;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .fab-mic {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: white;
      font-size: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 24px rgba(79,70,229,0.45);
      transition: transform 0.2s, box-shadow 0.2s;
      position: relative;
      overflow: visible;
    }
    .fab-mic:hover:not(:disabled) {
      transform: scale(1.08);
      box-shadow: 0 10px 32px rgba(79,70,229,0.55);
    }
    .fab-mic:disabled { opacity: 0.75; cursor: not-allowed; }

    /* Listening state — red pulse */
    .fab-mic.listening {
      background: linear-gradient(135deg, #dc2626, #b91c1c);
      box-shadow: 0 6px 24px rgba(220,38,38,0.5);
    }

    /* Speaking state — green */
    .fab-mic.speaking {
      background: linear-gradient(135deg, #059669, #047857);
      box-shadow: 0 6px 24px rgba(5,150,105,0.5);
    }

    /* Animated ring */
    .fab-ring {
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      border: 3px solid rgba(79,70,229,0.35);
      animation: ring-pulse 2s infinite;
      pointer-events: none;
    }
    .listening .fab-ring {
      border-color: rgba(220,38,38,0.5);
      animation: ring-pulse 0.8s infinite;
    }
    .speaking .fab-ring {
      border-color: rgba(5,150,105,0.5);
    }
    @keyframes ring-pulse {
      0%, 100% { transform: scale(1); opacity: 0.6; }
      50%       { transform: scale(1.25); opacity: 0.1; }
    }

    .fab-label {
      background: rgba(30,27,75,0.85);
      color: white;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 20px;
      letter-spacing: 0.5px;
      white-space: nowrap;
      backdrop-filter: blur(4px);
    }
    .speaking-label { background: rgba(4,120,87,0.85); }
  `]
})
export class FloatingAssistantComponent implements OnInit, OnDestroy {

  guidance  = inject(GuidanceService);
  stt       = inject(SpeechToTextService);
  auth      = inject(AuthService);
  router    = inject(Router);
  platformId = inject(PLATFORM_ID);

  isPatient   = false;
  currentPage  = signal<string>('home');

  private routerSub?: Subscription;

  private readonly PAGE_MAP: Record<string, string> = {
    '/home':                    'home',
    '/collaboration/feed':      'feed',
    '/collaboration/messenger': 'messages',
    '/collaboration/groups':    'groups',
    '/contact-doctor':          'doctor_list',
    '/patient-dashboard':       'profile',
    '/education':               'education',
    '/rendezvous':              'rendezvous',
  };

  private readonly ROUTE_MAP: Record<string, string[]> = {
    messages:      ['/collaboration/messenger'],
    feed:          ['/collaboration/feed'],
    community:     ['/collaboration/feed'],
    home:          ['/home'],
    groups:        ['/collaboration/groups'],
    doctor_list:   ['/contact-doctor'],
    profile:       ['/patient-dashboard'],
    notifications: ['/collaboration/feed'],
    education:     ['/education'],
    rendezvous:    ['/rendezvous'],
  };

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.isPatient   = this.auth.getRole() === 'PATIENT';

    this.currentPage.set(this.urlToPageName(this.router.url));
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.currentPage.set(this.urlToPageName(e.urlAfterRedirects ?? e.url));
      });

    this.guidance.toolDispatcher = (tool: string, args: string[]) => {
      this.handleToolCall(tool, args);
    };
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
    this.guidance.toolDispatcher = null;
  }

  async onMicClick() {
    if (!this.stt.isSupported) {
      this.guidance.speakImmediate('Voice input is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    await this.stt.listenForIntent(this.currentPage());
  }

  private handleToolCall(tool: string, args: string[]) {
    switch (tool) {

      case 'MapsTo': {
        const target = args[0]?.toLowerCase().trim();
        const route  = this.ROUTE_MAP[target];
        if (route) {
          this.router.navigate(route);
        }
        break;
      }

      case 'sendMessage': {
        const contactName = args[0] ?? '';
        const messageText = args[1] ?? '';
        this.router.navigate(['/collaboration/messenger'], {
          queryParams: { sendTo: contactName, text: messageText }
        });
        break;
      }

      case 'getAppContext': {
        const page = this.currentPage();
        this.guidance.describe('page', page, page);
        break;
      }
    }
  }

  private urlToPageName(url: string): string {
    for (const [path, name] of Object.entries(this.PAGE_MAP)) {
      if (url.startsWith(path)) return name;
    }
    return 'home';
  }
}
