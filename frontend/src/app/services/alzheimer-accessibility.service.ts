import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from './auth.service';
import { RendezVousService } from './rendezvous.service';
import { RendezVous } from '../models/rendezvous.model';
import { interval, Subscription } from 'rxjs';
import { filter, startWith, switchMap } from 'rxjs/operators';
import { Router, NavigationEnd } from '@angular/router';
import { AiService } from './ai.service';

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

  /** Whether the navigation voice guide is active (persisted in sessionStorage) */
  readonly voiceEnabled = signal<boolean>(this.loadVoiceEnabled());

  constructor(
    private authService: AuthService,
    private rendezvousService: RendezVousService,
    private router: Router,
    private aiService: AiService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    if (this.isBrowser) {
      this.initReminderLoop();
      this.initSpeechRecognition();
      this.initPageRouteListener();
    }
  }

  // ── Public API ────────────────────────────────────────────────

  /** Toggle the navigation voice guide on/off */
  toggleVoice(): void {
    const next = !this.voiceEnabled();
    this.voiceEnabled.set(next);
    sessionStorage.setItem('nav_voice_enabled', next ? '1' : '0');
    if (!next) {
      // Immediately stop any in-progress speech
      if (this.isBrowser && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } else {
      // Announce the feature is on
      this.speak('Guide vocal activé.');
    }
  }

  /** Stop all navigation voice immediately (called by other pages on destroy) */
  stopNavSpeech(): void {
    if (this.isBrowser && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  /** Pause the global listening so another service (like an AI audio session) can use the microphone */
  pauseGlobalListening(): void {
    if (!this.isBrowser || !this.recognition) return;
    this.ignoreVoiceCommands = true;
    this.stopListening();
    console.log('AlzheimerAccessibility: Global listening paused.');
  }

  /** Resume the global listening after the external process finishes */
  resumeGlobalListening(): void {
    if (!this.isBrowser || !this.recognition) return;
    this.ignoreVoiceCommands = false;
    this.startListening();
    console.log('AlzheimerAccessibility: Global listening resumed.');
  }

  // ── Private helpers ───────────────────────────────────────────

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
    if (!this.isBrowser || !window.speechSynthesis) return;
    // Respect the voice toggle
    if (!this.voiceEnabled()) return;

    // Interrupt any ongoing speech when navigating to a new page
    window.speechSynthesis.cancel();
    this.ignoreVoiceCommands = false;

    const url = this.router.url;
    let description = '';

    if (url.includes('/home')) {
      description = "Bienvenue sur la page d'accueil. Voici votre tableau de bord principal.";
    } else if (url.includes('/rendezvous')) {
      description = "Vous êtes sur la page des rendez-vous. Vous pouvez voir vos consultations planifiées.";
      const user = this.authService.getCurrentUser();
      if (user && user.id) {
        this.rendezvousService.getByPatient(user.id).subscribe(apps => {
          if (!this.router.url.includes('/rendezvous')) return;
          const active = apps.filter(a => a.statut === 'PLANIFIE' || a.statut === 'CONFIRME');
          if (active.length > 0) {
            const next = active.sort((a, b) => new Date(a.dateHeure).getTime() - new Date(b.dateHeure).getTime())[0];
            const date = new Date(next.dateHeure);
            this.speak(`${description} Votre prochain rendez-vous est le ${date.toLocaleDateString('fr-FR')} à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`);
          } else {
            this.speak(description);
          }
        });
        return;
      }
    } else if (url.includes('/patient-dashboard')) {
      description = "Voici votre espace personnel. Vous pouvez gérer votre profil et consulter votre historique médical.";
    } else if (url.includes('/messenger')) {
      description = "Vous êtes dans la messagerie. Vous pouvez communiquer avec vos médecins ou vos proches.";
    } else if (url.includes('/collaboration/feed') || url.includes('/collaboration')) {
      description = "Vous êtes sur la page communauté. Découvrez les actualités des autres membres.";
    } else if (url.includes('/education') || url.includes('/activities')) {
      description = "Voici l'espace éducation. Vous trouverez ici des activités et des vidéos utiles.";
    } else if (url.includes('/eventfront') || url.includes('/events')) {
      description = "Vous consultez les événements à venir. Rejoignez une session pour rester actif.";
    } else if (url.includes('/donations')) {
      description = "Vous êtes sur la page des dons. Vous pouvez contribuer aux campagnes en cours.";
    } else if (url.includes('/map') || url.includes('/patient-map')) {
      description = "Voici la carte. Vous pouvez trouver les hôpitaux et médecins proches de vous.";
    }

    if (description) {
      this.speak(description);
    }
  }

  // --- Voice Commands Navigation ---

  private initSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported in this browser.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.lang = 'fr-FR';
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      if (this.ignoreVoiceCommands || window.speechSynthesis.speaking) {
        return;
      }

      const last = event.results.length - 1;
      const command = event.results[last][0].transcript.toLowerCase().trim();

      if (command.length < 3) return;

      console.log('Voice Command received:', command);
      this.handleVoiceCommand(command);
    };

    this.recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        this.isListening = false;
      }
    };

    this.recognition.onend = () => {
      if (this.isListening && !this.ignoreVoiceCommands && !window.speechSynthesis.speaking) {
        try {
          this.recognition.start();
        } catch (e: any) { }
      }
    };

    if (this.isBrowser) {
      document.addEventListener('click', () => {
        if (!this.hasInteracted) {
          this.hasInteracted = true;
          if (this.authService.isLoggedIn() && this.authService.getRole() === 'PATIENT') {
            this.startListening();
            this.describeCurrentPage();
          }
        }
      }, { once: true });
    }
  }

  private startListening() {
    if (this.recognition && !this.isListening) {
      this.isListening = true;
      try {
        this.recognition.start();
        console.log('Started listening for voice commands...');
      } catch (e: any) { }
    }
  }

  private stopListening() {
    this.isListening = false;
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e: any) { }
    }
  }

  private handleVoiceCommand(command: string) {
    const currentUrl = this.router.url;

    if (command.includes('rendez-vous') || command.includes('consultation')) {
      if (!currentUrl.includes('/rendezvous')) {
        this.speak("J'ouvre vos rendez-vous.");
        this.router.navigate(['/rendezvous']);
      }
    } else if (command.includes('accueil') || command.includes('home')) {
      if (!currentUrl.includes('/home')) {
        this.speak("Retour à l'accueil.");
        this.router.navigate(['/home']);
      }
    } else if (command.includes('tableau de bord') || command.includes('dashboard')) {
      if (!currentUrl.includes('/patient-dashboard')) {
        this.speak("Ouverture de votre tableau de bord.");
        this.router.navigate(['/patient-dashboard']);
      }
    } else if (command.includes('activité') || command.includes('éducation') || command.includes('education')) {
      if (!currentUrl.includes('/education')) {
        this.speak("Voici les activités éducatives.");
        this.router.navigate(['/education']);
      }
    } else if (command.includes('message') || command.includes('messagerie')) {
      if (!currentUrl.includes('/messenger')) {
        this.speak("Ouverture de vos messages.");
        this.router.navigate(['/collaboration/messenger']);
      }
    } else if (command.includes('événement') || command.includes('event')) {
      if (!currentUrl.includes('/eventfront')) {
        this.speak("Voici les événements à venir.");
        this.router.navigate(['/eventfront']);
      }
    } else if (command.includes('communauté') || command.includes('community')) {
      if (!currentUrl.includes('/collaboration/feed')) {
        this.speak("Ouverture de la communauté.");
        this.router.navigate(['/collaboration/feed']);
      }
    } else if (command.includes('don') || command.includes('donation')) {
      if (!currentUrl.includes('/donations')) {
        this.speak("Ouverture de la page des dons.");
        this.router.navigate(['/donations']);
      }
    } else {
      this.processAICommand(command);
    }
  }

  // --- Reminders Logic ---

  private startReminders() {
    if (this.reminderSubscription) return;

    this.reminderSubscription = interval(120000)
      .pipe(
        startWith(0),
        filter(() => this.authService.isLoggedIn()),
        switchMap(() => {
          const user = this.authService.getCurrentUser();
          if (user && user.id) {
            return this.rendezvousService.getByPatient(user.id);
          }
          return [];
        })
      )
      .subscribe(appointments => {
        if (appointments && appointments.length > 0) {
          this.processAppointments(appointments);
        }
      });
  }

  private async processAICommand(command: string) {
    if (this.ignoreVoiceCommands || window.speechSynthesis.speaking) {
      return;
    }
    const result = await this.aiService.sendCommand(command);

    if (!result) {
      this.speak("Je n'ai pas compris. Veuillez répéter.");
      return;
    }

    const allowedRoutes = [
      '/home', '/rendezvous', '/patient-dashboard', '/education',
      '/collaboration/messenger', '/eventfront', '/collaboration/feed', '/donations'
    ];

    if (result.action === 'navigate' && allowedRoutes.includes(result.target)) {
      this.speak("D'accord, je vous y emmène."); this.router.navigate([result.target]);
      return;
    }

    if (result.action === 'speak' && result.message) {
      this.speak(result.message);
      return;
    }

    this.speak("Je n'ai pas compris. Veuillez répéter.");
  }

  private stopReminders() {
    this.reminderSubscription?.unsubscribe();
    this.reminderSubscription = undefined;
  }

  private processAppointments(appointments: RendezVous[]) {
    const activeAppointments = appointments.filter(app =>
      app.statut === 'PLANIFIE' || app.statut === 'CONFIRME'
    );

    if (activeAppointments.length === 0) return;

    const now = new Date();
    const upcoming = activeAppointments
      .map(app => ({ ...app, date: new Date(app.dateHeure) }))
      .filter(app => app.date > now)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (upcoming.length > 0) {
      const nextApp = upcoming[0];
      this.speakAppointment(nextApp);
    }
  }

  private speakAppointment(app: any) {
    // Only speak reminders if voice is enabled
    if (!this.voiceEnabled()) return;

    const now = new Date();
    const appDate = app.date;
    const diffMs = appDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let message = '';
    const timeStr = appDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    if (diffDays === 0) {
      if (diffHours < 1) {
        message = `Rappel : vous avez un rendez-vous très bientôt, à ${timeStr}.`;
      } else {
        message = `Rappel : vous avez un rendez-vous aujourd'hui à ${timeStr}.`;
      }
    } else if (diffDays === 1) {
      message = `Rappel : vous avez un rendez-vous demain à ${timeStr}.`;
    } else {
      const dateStr = appDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      message = `Rappel : vous avez un rendez-vous le ${dateStr} à ${timeStr}.`;
    }

    this.speak(message);
  }

  private speak(text: string) {
    if (!this.isBrowser || !window.speechSynthesis) return;
    // Respect the voice toggle for navigation speech
    if (!this.voiceEnabled()) return;

    this.ignoreVoiceCommands = true;

    if (this.recognition) {
      try { this.recognition.abort(); } catch (e: any) { }
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.85;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const frVoice = voices.find(v => v.lang.startsWith('fr'));
    if (frVoice) utterance.voice = frVoice;

    const resumeRec = () => {
      setTimeout(() => {
        this.ignoreVoiceCommands = false;
        if (this.isListening && this.recognition) {
          try { this.recognition.start(); } catch (e: any) { }
        }
      }, 1000);
    };

    utterance.onend = resumeRec;
    utterance.onerror = resumeRec;

    window.speechSynthesis.speak(utterance);
    console.log('AlzheimerAccessibility: Speaking -', text);
  }
}
