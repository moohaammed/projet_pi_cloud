import { Injectable, PLATFORM_ID, inject } from '@angular/core';
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

    // Interrupt any ongoing speech when navigating to a new page
    window.speechSynthesis.cancel();
    this.ignoreVoiceCommands = false;

    const url = this.router.url;
    let description = '';

    if (url.includes('/home')) {
      description = "Welcome home. This is your main dashboard where you can find an overview of your health status.";
    } else if (url.includes('/rendezvous')) {
      description = "You are on the appointments page. Here you can see your scheduled meetings with doctors.";
      const user = this.authService.getCurrentUser();
      if (user && user.id) {
        this.rendezvousService.getByPatient(user.id).subscribe(apps => {
          if (!this.router.url.includes('/rendezvous')) return;
          const active = apps.filter(a => a.statut === 'PLANIFIE' || a.statut === 'CONFIRME');
          if (active.length > 0) {
            const next = active.sort((a, b) => new Date(a.dateHeure).getTime() - new Date(b.dateHeure).getTime())[0];
            const date = new Date(next.dateHeure);
            this.speak(`${description} Your next appointment is on ${date.toLocaleDateString('en-US')} at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.`);
          } else {
            this.speak(description);
          }
        });
        return;
      }
    } else if (url.includes('/patient-dashboard')) {
      description = "This is your personal health center. You can manage your profile and see your medical history here.";
    } else if (url.includes('/messenger')) {
      description = "You are in the messages section. You can talk to your doctors or family members from here.";
    } else if (url.includes('/collaboration/feed') || url.includes('/collaboration')) {
      description = "You are on the community page. Here you can see updates from other members and share your own news.";
    } else if (url.includes('/education') || url.includes('/activities')) {
      description = "This is the education area. You can find activities and useful information to help you every day.";
    } else if (url.includes('/events')) {
      description = "You are looking at upcoming events and group sessions. Join a session to stay active.";
    } else if (url.includes('/donations')) {
      description = "You are on the donations page. Here you can see active campaigns and contribute to the community if you wish.";
    } else if (url.includes('/map')) {
      description = "This is the map. You can find nearby hospitals and doctors' offices here.";
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
    this.recognition.lang = 'en-US';
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
        console.log('Started listening for voice commands (English)...');
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

    if (command.includes('appointment') || command.includes('meeting')) {
      if (!currentUrl.includes('/rendezvous')) {
        this.speak("Opening your appointments.");
        this.router.navigate(['/rendezvous']);
      }
    }
    else if (command.includes('home') || command.includes('main page')) {
      if (!currentUrl.includes('/home')) {
        this.speak("Going to the home page.");
        this.router.navigate(['/home']);
      }
    }
    else if (command.includes('dashboard')) {
      if (!currentUrl.includes('/patient-dashboard')) {
        this.speak("Opening your dashboard.");
        this.router.navigate(['/patient-dashboard']);
      }
    }
    else if (command.includes('activity') || command.includes('education')) {
      if (!currentUrl.includes('/education')) {
        this.speak("Showing educational activities.");
        this.router.navigate(['/education']);
      }
    }
    else if (command.includes('message') || command.includes('chat')) {
      if (!currentUrl.includes('/messenger')) {
        this.speak("Opening your messages.");
        this.router.navigate(['/collaboration/messenger']);
      }
    }
    else if (command.includes('event')) {
      if (!currentUrl.includes('/events')) {
        this.speak("Checking upcoming events.");
        this.router.navigate(['/events']);
      }
    }
    else if (command.includes('community') || command.includes('feed')) {
      if (!currentUrl.includes('/collaboration/feed')) {
        this.speak("Opening the community feed.");
        this.router.navigate(['/collaboration/feed']);
      }
    }
    else if (command.includes('donation') || command.includes('give')) {
      if (!currentUrl.includes('/donations')) {
        this.speak("Opening the donations page.");
        this.router.navigate(['/donations']);
      }
    }
    else {
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
      this.speak("I did not understand. Please repeat.");
      return;
    }

    const allowedRoutes = [
      '/home',
      '/rendezvous',
      '/patient-dashboard',
      '/education',
      '/collaboration/messenger',
      '/events',
      '/collaboration/feed',
      '/donations'
    ];

    if (result.action === 'navigate' && allowedRoutes.includes(result.target)) {
      this.speak('Okay, I am taking you there now.'); this.router.navigate([result.target]);
      return;
    }

    if (result.action === 'speak' && result.message) {
      this.speak(result.message);
      return;
    }

    this.speak("I did not understand. Please repeat.");
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
    const now = new Date();
    const appDate = app.date;
    const diffMs = appDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let message = '';
    const timeStr = appDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    if (diffDays === 0) {
      if (diffHours < 1) {
        message = `Reminder: You have an appointment very soon, at ${timeStr}.`;
      } else {
        message = `Reminder: You have an appointment today at ${timeStr}.`;
      }
    } else if (diffDays === 1) {
      message = `Reminder: You have an appointment tomorrow at ${timeStr}.`;
    } else {
      const dateStr = appDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
      message = `Reminder: You have an appointment on ${dateStr} at ${timeStr}.`;
    }

    this.speak(message);
  }

  private speak(text: string) {
    if (!this.isBrowser || !window.speechSynthesis) return;

    this.ignoreVoiceCommands = true;

    if (this.recognition) {
      try { this.recognition.abort(); } catch (e: any) { }
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; // Switched to English
    utterance.rate = 0.85;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(v => v.lang.startsWith('en'));
    if (enVoice) utterance.voice = enVoice;

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
    console.log('AlzheimerAccessibility (EN): Speaking - ', text);
  }
}
