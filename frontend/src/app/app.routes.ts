import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { RendezVousListComponent } from './components/rendezvous-list/rendezvous-list.component';
import { RendezVousFormComponent } from './components/rendezvous-form/rendezvous-form.component';
import { RendezVousDetailComponent } from './components/rendezvous-detail/rendezvous-detail.component';
import { EventListComponent } from './components/education/event/event-list.component';
import { ActivityListComponent } from './components/education/activity/activity-list.component';
import { EducationComponent } from './components/education/activity/education.component';
import { EventFrontComponent } from './components/education/event/event_front';
import { ContactDoctorComponent } from './components/contact-doctor/contact-doctor.component';
import { DoctorDetailComponent } from './components/doctor-detail/doctor-detail.component';
import { CommunicationTestComponent } from './components/collaboration/communication-test/communication-test.component';
import { GestionPatientRoleComponent } from './gestion-patient-role/gestion-patient-role.component';
import { PatientDashboardComponent } from './patient-dashboard/patient-dashboard.component';
import { MedecinDashboardComponent } from './medecin-dashboard/medecin-dashboard.component';
import { HomeComponent } from './components/home/home.component';
import { AlertDashboardComponent } from './components/medecin/alert-dashboard/alert-dashboard.component';

// Donation
import { DonationListComponent } from './components/donation/donation-list/donation-list.component';
import { DonationFormComponent } from './components/donation/donation-form/donation-form.component';
import { DonationSuccessComponent } from './components/donation/donation-success/donation-success.component';
import { DonationCancelComponent } from './components/donation/donation-cancel/donation-cancel.component';
import { MyDonationsComponent } from './components/donation/my-donations/my-donations.component';

export const routes: Routes = [

  { path: '', redirectTo: 'home', pathMatch: 'full' },

  // ===== AUTH =====

  {
    path: 'auth/login',
    loadComponent: () =>
      import('./components/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'auth/register',
    loadComponent: () =>
      import('./components/auth/register/register.component').then(m => m.RegisterComponent)
  },

  { path: 'home', component: HomeComponent, canActivate: [authGuard] },


  {
    path: 'users',
    loadComponent: () =>
      import('./components/user/user-list/user-list.component').then(m => m.UserListComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] }
  },
  {
    path: 'users/new',
    loadComponent: () =>
      import('./components/user/user-form/user-form.component').then(m => m.UserFormComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] }
  },
  {
    path: 'users/edit/:id',
    loadComponent: () =>
      import('./components/user/user-form/user-form.component').then(m => m.UserFormComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] }
  },

  // ===== HOSPITALS — ADMIN + DOCTOR =====
  {
    path: 'hospitals',
    loadComponent: () =>
      import('./components/hospital/hospital-list/hospital-list.component')
        .then(m => m.HospitalListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'hospitals/new',
    loadComponent: () =>
      import('./components/hospital/hospital-form/hospital-form.component')
        .then(m => m.HospitalFormComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN', 'DOCTOR'] }  // ← DOCTOR peut ajouter
  },
  {
    path: 'hospitals/edit/:id',
    loadComponent: () =>
      import('./components/hospital/hospital-form/hospital-form.component')
        .then(m => m.HospitalFormComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN', 'DOCTOR'] }  // ← DOCTOR peut modifier
  },
  {
    path: 'hospitals/:id',
    loadComponent: () =>
      import('./components/hospital/hospital-detail/hospital-detail.component')
        .then(m => m.HospitalDetailComponent),
    canActivate: [authGuard]
  },

  // ===== MAP =====
  {
    path: 'map',
    loadComponent: () =>
      import('./components/map/doctor-map/doctor-map.component')
        .then(m => m.DoctorMapComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['DOCTOR', 'ADMIN'] }
  },
  {
  path: 'patient-profiles',
  loadComponent: () =>
    import('./components/patient/patient-list/patient-list.component')
      .then(m => m.PatientListComponent),
  canActivate: [authGuard, roleGuard],
  data: { roles: ['ADMIN', 'DOCTOR'] }
},
{
  path: 'patient-profiles/new',
  loadComponent: () =>
    import('./components/patient/patient-form/patient-form.component')
      .then(m => m.PatientFormComponent),
  canActivate: [authGuard, roleGuard],
  data: { roles: ['ADMIN'] }
},
{
  path: 'patient-profiles/edit/:id',
  loadComponent: () =>
    import('./components/patient/patient-form/patient-form.component')
      .then(m => m.PatientFormComponent),
  canActivate: [authGuard, roleGuard],
  data: { roles: ['ADMIN', 'DOCTOR'] }
},
{
  path: 'medecin/alertes',
  component: AlertDashboardComponent
},
{
  path: 'patient-profiles/:id',
  loadComponent: () =>
    import('./components/patient/patient-detail/patient-detail.component')
      .then(m => m.PatientDetailComponent),
  canActivate: [authGuard, roleGuard],
  data: { roles: ['ADMIN', 'DOCTOR'] }
},
{
  path: 'patient-map',
  loadComponent: () =>
    import('./components/map/patient-map/patient-map.component')
      .then(m => m.PatientMapComponent),
  canActivate: [authGuard, roleGuard],
  data: { roles: ['PATIENT'] }
},


  // ===== COLLABORATION (Avec sous-routes lazy-loadées) =====


  // ===== COLLABORATION =====

  {
    path: 'collaboration',
    component: CommunicationTestComponent,
    children: [
      { path: '', redirectTo: 'feed', pathMatch: 'full' },
      {
        path: 'feed',
        loadComponent: () =>
          import('./components/collaboration/feed/feed.component').then(m => m.FeedComponent)
      },
      {
        path: 'messenger',
        loadComponent: () =>
          import('./components/collaboration/messenger/messenger.component').then(m => m.MessengerComponent)
      },
      {
        path: 'groups',
        loadComponent: () =>
          import('./components/collaboration/groups-list/groups-list.component').then(m => m.GroupsListComponent)
      },
      {
        path: 'groups/:groupId/feed',
        loadComponent: () =>
          import('./components/collaboration/feed/feed.component').then(m => m.FeedComponent)
      }
    ]
  },

  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      {
        path: 'dashboard',
        loadComponent: () =>
          import('./components/admin-dashboard-home/admin-dashboard-home.component')
            .then(m => m.AdminDashboardHomeComponent)
      },
      {
        path: 'collaboration',
        loadComponent: () =>
          import('./components/collaboration/admin-collaboration-dashboard/admin-collaboration-dashboard.component')
            .then(m => m.AdminCollaborationDashboardComponent)
      },
      {
        path: 'rendezvous',
        loadComponent: () =>
          import('./components/dashboard/admin-dashboard/admin-dashboard.component')
            .then(m => m.AdminDashboardComponent)

      },

      // ✅ EDUCATION MODULE REFACTOR
      {
        path: 'activities',
        loadComponent: () =>
          import('./components/education/activity/activity-list.component')
            .then(m => m.ActivityListComponent)
      },
      {
        path: 'events',
        loadComponent: () =>
          import('./components/education/event/event-list.component')
            .then(m => m.EventListComponent)
      },
      {
        path: 'education',
        loadComponent: () =>
          import('./components/education/admin-education-dashboard/admin-education-dashboard.component')
            .then(m => m.AdminEducationDashboardComponent)
      },
      {
        path: 'donations',
        loadComponent: () =>
          import('./components/donation/admin-donation/admin-donation.component')
            .then(m => m.AdminDonationComponent)
      },
      {
        path: 'patients',
        loadComponent: () =>
          import('./components/admin-gestion-patient/admin-gestion-patient.component')
            .then(m => m.AdminGestionPatientComponent)
      },
      {
        path: 'medecins',
        loadComponent: () =>
          import('./components/admin-gestion-medecin/admin-gestion-medecin.component')
            .then(m => m.AdminGestionMedecinComponent)
      }
    ]
  },

  // DASHBOARDS
  {
    path: 'patient-dashboard',
    component: PatientDashboardComponent,
    canActivate: [authGuard]
  },
  {
    path: 'medecin-dashboard',
    component: MedecinDashboardComponent,
    canActivate: [authGuard]
  },
  {
    path: 'gestion-patient-role',
    component: GestionPatientRoleComponent,
    canActivate: [authGuard]
  },

  { path: 'contact-doctor', component: ContactDoctorComponent },
  { path: 'doctor-detail/:id', component: DoctorDetailComponent },

  // RENDEZ-VOUS
  { path: 'rendezvous', component: RendezVousListComponent, canActivate: [authGuard] },
  { path: 'rendezvous/new', component: RendezVousFormComponent, canActivate: [authGuard] },
  { path: 'rendezvous/:id', component: RendezVousDetailComponent, canActivate: [authGuard] },
  { path: 'rendezvous/:id/edit', component: RendezVousFormComponent, canActivate: [authGuard] },


  // EDUCATION

  { path: 'events', component: EventListComponent, canActivate: [authGuard] },
  { path: 'activities', component: ActivityListComponent, canActivate: [authGuard] },
  { path: 'education', component: EducationComponent, canActivate: [authGuard] },
  { path: 'eventfront', component: EventFrontComponent, canActivate: [authGuard] },


  // DONATIONS
  { path: 'donations', component: DonationListComponent },
  { path: 'donations/success', component: DonationSuccessComponent },
  { path: 'donations/cancel', component: DonationCancelComponent },
  { path: 'my-donations', component: MyDonationsComponent, canActivate: [authGuard] },
  { path: 'donations/:campaignId', component: DonationFormComponent },



  // SMARTWATCH — Heart Rate Monitor
  {
    path: 'heart-rate',
    loadComponent: () =>
      import('./components/live-heart-rate/live-heart-rate.component')
        .then(m => m.LiveHeartRateComponent),
    canActivate: [authGuard]
  },

  { path: '**', redirectTo: 'auth/login' }
];
