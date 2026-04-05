import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PublicationService, PublicationDto } from '../../services/collaboration/publication.service';
import { RendezVousService } from '../../services/rendezvous.service';
import { RendezVous } from '../../models/rendezvous.model';
import { NotificationService } from '../../services/collaboration/notification.service';
import { AlzUserService } from '../../services/alz-user.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  private authService = inject(AuthService);
  private publicationService = inject(PublicationService);
  private rendezvousService = inject(RendezVousService);
  private notificationService = inject(NotificationService);
  private userService = inject(AlzUserService);

  currentUser = signal<any>(null);
  recentPosts = signal<PublicationDto[]>([]);
  upcomingRendezvous = signal<RendezVous[]>([]);
  unreadNotificationsCount = computed(() => 
    this.notificationService.notifications().filter(n => !n.isRead).length
  );

  stats = signal({
    posts: 0,
    appointments: 0,
    groups: 0
  });

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.currentUser.set(user);

    if (user && user.id) {
      this.loadDashboardData(user.id);
    }
  }

  loadDashboardData(userId: number): void {
    // 1. Fetch latest publications (limit to 3)
    this.publicationService.fetchPublications();
    // We'll use an effect or subscribe to get the first 3
    
    // 2. Fetch upcoming appointments
    const role = this.authService.getRole();
    if (role === 'DOCTOR') {
      this.rendezvousService.getByMedecin(userId).subscribe(data => {
        this.upcomingRendezvous.set(this.filterUpcoming(data));
        this.stats.update(s => ({ ...s, appointments: data.length }));
      });
    } else {
      this.rendezvousService.getByPatient(userId).subscribe(data => {
        this.upcomingRendezvous.set(this.filterUpcoming(data));
        this.stats.update(s => ({ ...s, appointments: data.length }));
      });
    }

    // 3. Load user counts (mocked or from real services if available)
    // For now we just use what we have
  }

  filterUpcoming(rvs: RendezVous[]): RendezVous[] {
    const now = new Date();
    return rvs
      .filter(rv => new Date(rv.dateHeure) >= now && rv.statut !== 'ANNULE')
      .sort((a, b) => new Date(a.dateHeure).getTime() - new Date(b.dateHeure).getTime())
      .slice(0, 3);
  }

  getUserName(userId: number): string {
    const user = this.userService.users().find(u => u.id === userId);
    if (user) return `${user.prenom} ${user.nom}`;
    return 'Someone';
  }

  getUserImage(userId: number): string | null {
    const user = this.userService.users().find(u => u.id === userId);
    let imageUrl = user?.image;
    if (!imageUrl && this.currentUser()?.id === userId) {
      imageUrl = this.currentUser()?.image;
    }
    
    if (imageUrl && imageUrl.startsWith('/uploads/')) {
      return 'http://localhost:8080' + imageUrl;
    }
    return imageUrl || null;
  }

  getLatestPublications() {
    return this.publicationService.publications().slice(0, 4);
  }
}
