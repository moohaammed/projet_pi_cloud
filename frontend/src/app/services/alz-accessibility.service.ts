import { Injectable, PLATFORM_ID, inject, signal, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from './auth.service';
import { RendezVousService } from './rendezvous.service';
import { RendezVous } from '../models/rendezvous.model';
import { interval, Subscription } from 'rxjs';
import { filter, startWith, switchMap } from 'rxjs/operators';
import { Router, NavigationEnd } from '@angular/router';
import { AiService } from './ai.service';
import { VideoCallService } from './videocall.service';

@Injectable({
  providedIn: 'root'
})
export class AlzheimerAccessibilityService {
  private reminderSubscription?: Subscription;
  private routeSubscription?: Subscription;
  private isBrowser: boolean;
  private recognition: any;
  private isListening: boolean = false;
  private platformId = inject(PLATFORM_ID);
  private ignoreVoiceCommands: boolean = false;
  private hasInteracted: boolean = false;
  private isAgentPaused: boolean = false;

  readonly voiceEnabled = signal<boolean>(this.loadVoiceEnabled());

  constructor(
    private authService: AuthService,
    private rendezvousService: RendezVousService,
    private router: Router,
    private aiService: AiService,
    private videoCallService: VideoCallService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    if (this.isBrowser) {
      this.initReminderLoop();
      this.initSpeechRecognition();
      this.initPageRouteListener();
      this.initCallActiveListener();
    }
  }

  private initCallActiveListener() {
    effect(() => {
      const isCallActive = this.videoCallService.showCallOverlay();
      if (isCallActive) {
        this.pauseAgent();
      } else {
        this.resumeAgent();
      }
    });
  }

  private pauseAgent() {
    this.isAgentPaused = true;
    this.stopListening();
    this.stopReminders();
    window.speechSynthesis?.cancel();
  }

  private resumeAgent() {
    this.isAgentPaused = false;
    const isPatient = this.authService.isLoggedIn() && this.authService.getRole() === 'PATIENT';
    if (isPatient) {
      this.startListening();
      this.startReminders();
    }
  }

  toggleVoice(): void {
    const next = !this.voiceEnabled();
    this.voiceEnabled.set(next);
    sessionStorage.setItem('nav_voice_enabled', next ? '1' : '0');

    if (!next) {
      window.speechSynthesis?.cancel();
    } else {
      this.speak('Guide vocal activé.');
    }
  }

  stopNavSpeech(): void {
    window.speechSynthesis?.cancel();
  }

  pauseGlobalListening(): void {
    if (!this.isBrowser || !this.recognition) return;
    this.ignoreVoiceCommands = true;
    this.stopListening();
  }

  resumeGlobalListening(): void {
    if (!this.isBrowser || !this.recognition) return;
    this.ignoreVoiceCommands = false;
    this.startListening();
  }

  private loadVoiceEnabled(): boolean {
    try {
      return sessionStorage.getItem('nav_voice_enabled') !== '0';
    } catch {
      return true;
    }
  }

  private initReminderLoop() {
    this.authService.getLoggedIn$().subscribe(loggedIn => {
      const isPatient = this.authService.getRole() === 'PATIENT';
      if (loggedIn && isPatient) {
        this.startReminders();
        this.startListening();
      } else {
        this.stopReminders();
        this.stopListening();
      }
    });
  }

  private initPageRouteListener() {
    this.routeSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.authService.isLoggedIn() && this.authService.getRole() === 'PATIENT') {
        this.describeCurrentPage();
      }
    });
  }

  private describeCurrentPage() {
    if (!this.isBrowser || !window.speechSynthesis || this.isAgentPaused) return;
    if (!this.voiceEnabled()) return;

    window.speechSynthesis.cancel();
    this.ignoreVoiceCommands = false;

    const url = this.router.url;
    let description = '';

    if (url.includes('/home')) {
      description = "Welcome to the home page.";
    } else if (url.includes('/rendezvous')) {
      description = "You are on the appointments page.";
    } else if (url.includes('/patient-dashboard')) {
      description = "This is your personal space.";
    } else if (url.includes('/messenger')) {
      description = "You are in the messaging section.";
    } else if (url.includes('/education')) {
      description = "This is the education section.";
    } else if (url.includes('/eventfront')) {
      description = "You are viewing upcoming events.";
    } else if (url.includes('/donations')) {
      description = "You are on the donations page.";
    }

    if (description) this.speak(description);
  }

  private initSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event: any) => {
      if (this.isAgentPaused || this.ignoreVoiceCommands || window.speechSynthesis.speaking) return;

      const command = event.results[event.results.length - 1][0].transcript.toLowerCase();
      this.handleVoiceCommand(command);
    };

    this.recognition.onend = () => {
      if (this.isListening && !this.ignoreVoiceCommands) {
        this.recognition.start();
      }
    };

    document.addEventListener('click', () => {
      if (!this.hasInteracted) {
        this.hasInteracted = true;
        this.startListening();
      }
    }, { once: true });
  }

  private startListening() {
    if (this.isAgentPaused) return;
    if (this.recognition && !this.isListening) {
      this.isListening = true;
      try {
        this.recognition.start();
      } catch (err: any) {
        if (err.name === 'InvalidStateError') {
          console.warn('[Alz Accessibility] SpeechRecognition is already started or starting.');
        } else {
          console.error('[Alz Accessibility] Error starting SpeechRecognition:', err);
        }
      }
    }
  }

  private stopListening() {
    this.isListening = false;
    this.recognition?.stop();
  }

  private handleVoiceCommand(command: string) {
    if (command.includes('rendez')) this.router.navigate(['/rendezvous']);
    else if (command.includes('accueil')) this.router.navigate(['/home']);
    else this.processAICommand(command);
  }

  private async processAICommand(command: string) {
    const result = await this.aiService.sendCommand(command);
    if (result?.action === 'navigate') {
      this.router.navigate([result.target]);
    } else if (result?.message) {
      this.speak(result.message);
    }
  }

  private startReminders() {
    if (this.isAgentPaused || this.reminderSubscription) return;

    this.reminderSubscription = interval(120000).pipe(
      startWith(0),
      switchMap(() => {
        const user = this.authService.getCurrentUser();
        return user?.id ? this.rendezvousService.getByPatient(user.id) : [];
      })
    ).subscribe(apps => this.processAppointments(apps));
  }

  private stopReminders() {
    this.reminderSubscription?.unsubscribe();
  }

  private processAppointments(apps: RendezVous[]) {
    if (!apps?.length) return;

    const now = new Date();

    const upcoming = apps
      .map(app => ({ ...app, date: new Date(app.dateHeure) }))
      .filter(app => app.date > now)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (upcoming.length === 0) return;

    const next = upcoming[0];

    const dateStr = next.date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });

    const timeStr = next.date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    this.speak(`Reminder: You have an appointment on ${dateStr} at ${timeStr}.`);
  }

  private speak(text: string) {
    if (!this.isBrowser || !window.speechSynthesis || this.isAgentPaused) return;
    if (!this.voiceEnabled()) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';

    window.speechSynthesis.speak(utterance);
  }
}