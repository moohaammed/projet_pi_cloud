import { Component, inject, effect, untracked, signal, PLATFORM_ID, OnDestroy } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from './services/auth.service';
import { WebSocketService } from './services/collaboration/websocket.service';
import { NotificationService } from './services/collaboration/notification.service';
import { VideoCallService } from './services/videocall.service';
import { VideoCallComponent } from './components/videocall/videocall.component';
import { Subscription } from 'rxjs';

import { AccessibilityService } from './services/accessibility.service';
import { AccessibilityToggleComponent } from './components/accessibility-toggle/accessibility-toggle.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule, VideoCallComponent, AccessibilityToggleComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnDestroy {
  title = 'MediSync';
  navOpen = false;
  auth = inject(AuthService);
  router = inject(Router);
  webSocketService = inject(WebSocketService);
  notificationService = inject(NotificationService);
  videoCallService = inject(VideoCallService);
  platformId = inject(PLATFORM_ID);
  accService = inject(AccessibilityService);

  // Video Call State
  showVideoCall = inject(VideoCallService).showCallOverlay;
  videoCallRoomId = inject(VideoCallService).currentRoomId;
  incomingVideoCall = signal<{ roomId: string; callerName: string; senderId: string } | null>(null);
  notificationPermissionDenied = signal<boolean>(false);
  private videoCallInviteSub?: Subscription;

  constructor() {
    // Reactive connection to WebSocket and VideoCall when user is logged in
    this.auth.getLoggedIn$().subscribe(loggedIn => {
      if (loggedIn) {
        const user = this.auth.getCurrentUser();
        if (user && user.id) {
          this.webSocketService.setUserId(user.id);
          this.videoCallService.connect(user.id.toString());
          console.log('AppComponent: Auto-connecting services for user', user.id);
        }
      } else {
        this.videoCallService.disconnect();
        console.log('AppComponent: Disconnecting services (logout)');
      }
    });

    effect(() => {
      const notif = this.webSocketService.notificationMessage();
      if (notif) {
        untracked(() => {
          this.notificationService.addNotification(notif);
        });
      }
    });
    
    // Initial check if already logged in (e.g. page refresh)
    if (this.auth.isLoggedIn()) {
      const user = this.auth.getCurrentUser();
      if (user && user.id) {
        this.webSocketService.setUserId(user.id);
        this.videoCallService.connect(user.id.toString());
      }
    }

    if (isPlatformBrowser(this.platformId)) {
      this.videoCallInviteSub = this.videoCallService.signalMessages$.subscribe((msg) => {
        console.log('AppComponent: Signal REÇU', msg.type, 'de', msg.senderId, 'pour', msg.recipientId);
        
        if (msg.type !== 'messenger-invite' && msg.type !== 'rendezvous-invite') {
          console.log('AppComponent: Signal ignoré (type incorrect)');
          return;
        }
        
        const user = this.auth.getCurrentUser();
        if (!user) {
          console.warn('AppComponent: Pas d\'utilisateur connecté, signal ignoré');
          return;
        }
        const me = String(user.id);
        if (String(msg.senderId) === me) {
          console.log('AppComponent: Signal ignoré (envoyé par moi-même)');
          return;
        }

        let data = msg.data;
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch {
            console.error('AppComponent: Erreur parsing data signal', data);
            return;
          }
        }
        const roomId = data?.roomId as string | undefined;
        if (!roomId) {
          console.error('AppComponent: RoomId manquant dans le signal data', data);
          return;
        }

        // Targeted check
        if (msg.recipientId && String(msg.recipientId).trim() !== '') {
          if (String(msg.recipientId) !== me) {
            console.log('AppComponent: Signal ignoré (destiné à un autre user)', msg.recipientId);
            return;
          }
        }

        console.log('AppComponent: Affichage de la barre d\'appel pour', roomId);
        const callerName = (data?.callerName as string) || 'Someone';
        this.incomingVideoCall.set({ roomId, callerName, senderId: String(msg.senderId) });
      });
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.notificationPermissionDenied.set(Notification.permission === 'denied');
    }
  }

  ngOnDestroy(): void {
    this.videoCallInviteSub?.unsubscribe();
  }

  acceptIncomingVideoCall(): void {
    const inv = this.incomingVideoCall();
    if (!inv) return;
    this.incomingVideoCall.set(null);
    
    // Logic to redirect if needed
    this.applyRoomFromVideoInvite(inv.roomId);
    
    this.videoCallService.openCall(inv.roomId);
  }

  declineIncomingVideoCall(): void {
    this.incomingVideoCall.set(null);
  }

  closeGlobalVideoCall(): void {
    this.videoCallService.closeCallOverlay();
    this.incomingVideoCall.set(null);
  }

  private applyRoomFromVideoInvite(roomId: string): void {
    // Rendezvous
    if (/^\d+$/.test(roomId)) {
      this.router.navigate(['/rendezvous', roomId]);
      return;
    }

    // Messenger DM
    const dmMatch = /^collab-dm-(\d+)-(\d+)$/.exec(roomId);
    if (dmMatch) {
      const a = Number(dmMatch[1]);
      const b = Number(dmMatch[2]);
      const user = this.auth.getCurrentUser();
      const me = user?.id;
      const other = a === me ? b : b === me ? a : null;
      if (other != null) {
        this.router.navigate(['/collaboration/messenger'], { queryParams: { dm: other } });
      }
      return;
    }

    // Messenger Group
    const grpMatch = /^collab-group-(\d+)$/.exec(roomId);
    if (grpMatch) {
      const gid = Number(grpMatch[1]);
      this.router.navigate(['/collaboration/messenger'], { queryParams: { group: gid } });
    }
  }

  isAuthPage(): boolean {
    const url = this.router.url;
    return url.includes('auth/login') || url.includes('auth/register');
  }

  showAdminShell(): boolean {
    return this.auth.isLoggedIn() && 
           this.auth.getRole() === 'ADMIN' && 
           !this.isAuthPage();
  }

  // Global Admin Layout State
  isSidebarCollapsed = false;
  globalSearchQuery = '';

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  doGlobalSearch() {
    console.log("Global search requested for:", this.globalSearchQuery);
    // Future: Use an Event Bus or a Service to broadcast this query to the active module
  }

  getAccountLink(): string {
    const role = this.auth.getRole();
    if (role === 'ADMIN') {
      return '/admin/dashboard';
    }
    if (role === 'DOCTOR') {
      return '/medecin-dashboard';
    }
    if (role === 'ADMIN') {
      return '/admin/dashboard';
    }
    return '/patient-dashboard';
  }

  isLoggedIn(): boolean {
    return this.auth.isLoggedIn();
  }

  getBreadcrumbs(): string {
    const url = this.router.url;
    if (url.includes('home')) return 'Accueil';
    if (url.includes('scans')) return 'Accueil > Mes Scans';
    if (url.includes('results')) return 'Accueil > Mes Scans > Résultat';
    if (url.includes('patient-dashboard')) return 'Accueil > Tableau de Bord';
    return 'Accueil';
  }

  getInstructionPhrase(): string {
    const url = this.router.url;
    if (url.includes('results')) return 'Sur cette page, vous pouvez voir la réponse de votre médecin.';
    if (url.includes('scans')) return 'Sur cette page, vous pouvez envoyer vos images médicales.';
    if (url.includes('rendezvous')) return 'Sur cette page, vous pouvez demander un rendez-vous.';
    return 'Utilisez les boutons ci-dessous pour naviguer.';
  }
}
