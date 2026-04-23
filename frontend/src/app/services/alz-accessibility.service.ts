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
      description = "Bienvenue sur la page d'accueil.";
    } else if (url.includes('/rendezvous')) {
      description = "Vous êtes sur la page des rendez-vous.";
    } else if (url.includes('/patient-dashboard')) {
      description = "Voici votre espace personnel.";
    } else if (url.includes('/messenger')) {
      description = "Vous êtes dans la messagerie.";
    } else if (url.includes('/education')) {
      description = "Voici l'espace éducation.";
    } else if (url.includes('/eventfront')) {
      description = "Vous consultez les événements.";
    } else if (url.includes('/donations')) {
      description = "Vous êtes sur la page des dons.";
    }

    if (description) this.speak(description);
  }

  private initSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.lang = 'fr-FR';

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
    this.speak("Vous avez des rendez-vous à venir.");
  }

  private speak(text: string) {
    if (!this.isBrowser || !window.speechSynthesis || this.isAgentPaused) return;
    if (!this.voiceEnabled()) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';

    window.speechSynthesis.speak(utterance);
  }
}