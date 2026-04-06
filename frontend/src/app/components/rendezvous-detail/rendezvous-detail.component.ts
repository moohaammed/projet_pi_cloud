import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { RendezVousService } from '../../services/rendezvous.service';
import { RendezVous, StatutRendezVous } from '../../models/rendezvous.model';
import { VideoCallComponent } from '../videocall/videocall.component';
import { AuthService } from '../../services/auth.service';
import { VideoCallService, SignalMessage } from '../../services/videocall.service';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-rendezvous-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, VideoCallComponent],
  templateUrl: './rendezvous-detail.component.html',
  styleUrls: ['./rendezvous-detail.component.css']
})
export class RendezVousDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(RendezVousService);
  private authService = inject(AuthService);
  private videoCallService = inject(VideoCallService);

  rv: RendezVous | null = null;
  loading = true;
  error = '';
  deleteConfirm = false;
  currentUser: any = null;

  showVideoCall = inject(VideoCallService).showCallOverlay;

  statutLabels: Record<StatutRendezVous, string> = {
    PLANIFIE: 'Planifié',
    CONFIRME: 'Confirmé',
    ANNULE: 'Annulé',
    TERMINE: 'Terminé'
  };

  constructor() {
    this.currentUser = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.service.getById(+id).subscribe({
        next: (data) => {
          console.log('VC: RendezVous data loaded', data);
          // Check access
          if (this.currentUser) {
            if (this.currentUser.role === 'DOCTOR' && data.medecinId !== this.currentUser.id) {
              this.error = 'Accès refusé. Ce rendez-vous ne vous est pas assigné.';
              this.loading = false;
              return;
            }
            if (this.currentUser.role === 'PATIENT' && data.patientId !== this.currentUser.id) {
              this.error = 'Accès refusé. Ce rendez-vous ne vous est pas assigné.';
              this.loading = false;
              return;
            }
          }

          this.rv = data;
          this.loading = false;
        },
        error: () => {
          this.error = 'Rendez-vous introuvable.';
          this.loading = false;
        }
      });
    }
  }

  getStatutClass(statut?: StatutRendezVous): string {
    const map: Record<StatutRendezVous, string> = {
      PLANIFIE: 'bg-warning',
      CONFIRME: 'bg-success',
      ANNULE: 'bg-danger',
      TERMINE: 'bg-primary'
    };
    return statut ? map[statut] ?? 'bg-secondary' : 'bg-secondary';
  }

  deleteRv(id: number): void {
    if (confirm('Voulez-vous vraiment supprimer ce rendez-vous ?')) {
      this.service.delete(id).subscribe({
        next: () => this.router.navigate(['/rendezvous']),
        error: () => { this.error = 'Erreur lors de la suppression.'; }
      });
    }
  }

  toggleVideoCall(): void {
    if (!this.showVideoCall() && this.rv) {
      this.sendRendezvousInvite();
      this.videoCallService.openCall(this.rv.id.toString());
    } else {
      this.videoCallService.closeCallOverlay();
    }
  }

  private sendRendezvousInvite(): void {
    if (!this.rv || !this.currentUser) {
      console.warn('VC: RendezVous or CurrentUser not found', this.rv, this.currentUser);
      return;
    }

    const me = this.currentUser.id;
    const roomId = this.rv.id.toString();
    
    // Use loose equality or conversion to be safe with string vs number
    let otherParticipantId = null;
    const isDoctor = String(this.currentUser.role).toUpperCase() === 'DOCTOR';
    const isPatient = String(this.currentUser.role).toUpperCase() === 'PATIENT';

    // Access the fields safely, sometimes they might be on different property names depending on backend serialization
    const pId = this.rv.patientId || (this.rv as any)['patient_id'];
    const mId = this.rv.medecinId || (this.rv as any)['medecin_id'] || (this.rv as any)['medecinId'];

    if (isDoctor) {
      otherParticipantId = pId;
    } else if (isPatient) {
      otherParticipantId = mId;
    }

    console.log('VC: Rendezvous context check', {
      currentUserId: me,
      currentUserRole: this.currentUser.role,
      rvPatientId: pId,
      rvMedecinId: mId,
      isDoctor,
      isPatient,
      determinedOtherId: otherParticipantId
    });

    if (otherParticipantId == null) {
      console.error('VC: Could not determine other participant ID. Signal not sent.', this.rv);
      return;
    }

    // Connect and subscribe before sending
    this.videoCallService.connect(me.toString());
    this.videoCallService.ensureSubscribedToRoom(roomId);

    const sendInvite = () => {
      const u = this.currentUser;
      const callerName = [u?.prenom, u?.nom].filter(Boolean).join(' ') || 
                         (u as any)?.username || 
                         u?.email || 
                         'Someone';
      const invite: SignalMessage = {
        type: 'rendezvous-invite',
        senderId: String(me),
        recipientId: String(otherParticipantId),
        data: { roomId, callerName }
      };
      this.videoCallService.sendSignal(roomId, invite);
    };

    if (this.videoCallService.isConnected$.value) {
      sendInvite();
    } else {
      this.videoCallService.isConnected$.pipe(
        filter(c => c),
        take(1)
      ).subscribe(() => {
        sendInvite();
      });
    }
  }
}
