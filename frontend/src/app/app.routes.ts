import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

// ===== EXISTANT =====
import { RendezVousListComponent } from './components/rendezvous-list/rendezvous-list.component';
import { RendezVousFormComponent } from './components/rendezvous-form/rendezvous-form.component';
import { RendezVousDetailComponent } from './components/rendezvous-detail/rendezvous-detail.component';
import { EventListComponent } from './components/education/event/event-list.component';
import { ActivityListComponent } from './components/education/activity/activity-list.component';
import { EducationComponent } from './components/education/activity/education.component';
import { EventFrontComponent } from './components/education/event/event_front';

// Tes imports (Gestion Patient & Collaboration)
import { CommunicationTestComponent } from './components/collaboration/communication-test/communication-test.component';
import { GestionPatientRoleComponent } from './gestion-patient-role/gestion-patient-role.component';
import { PatientDashboardComponent } from './patient-dashboard/patient-dashboard.component';
import { MedecinDashboardComponent } from './medecin-dashboard/medecin-dashboard.component';

export const routes: Routes = [

  // ===== AUTH AlzCare =====
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./components/auth/login/login.component')
        .then(m => m.LoginComponent)
  },
  {
    path: 'auth/register',
    loadComponent: () =>
      import('./components/auth/register/register.component')
        .then(m => m.RegisterComponent)
  },

  // ===== USERS AlzCare =====
  {
    path: 'users',
    loadComponent: () =>
      import('./components/user/user-list/user-list.component')
        .then(m => m.UserListComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] }
  },
  {
    path: 'users/new',
    loadComponent: () =>
      import('./components/user/user-form/user-form.component')
        .then(m => m.UserFormComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] }
  },
  {
    path: 'users/edit/:id',
    loadComponent: () =>
      import('./components/user/user-form/user-form.component')
        .then(m => m.UserFormComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] }
  },

  // ===== HOSPITALS AlzCare =====
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
    data: { roles: ['ADMIN'] }
  },
  {
    path: 'hospitals/edit/:id',
    loadComponent: () =>
      import('./components/hospital/hospital-form/hospital-form.component')
        .then(m => m.HospitalFormComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] }
  },
  {
    path: 'hospitals/:id',
    loadComponent: () =>
      import('./components/hospital/hospital-detail/hospital-detail.component')
        .then(m => m.HospitalDetailComponent),
    canActivate: [authGuard]
  },

  // ===== EXISTANT (inchangé) =====
  {
    path: 'collaboration',
    component: CommunicationTestComponent,
    children: [
      {
        path: 'feed',
        loadComponent: () =>
          import('./components/collaboration/feed/feed.component')
            .then(m => m.FeedComponent)
      },
      {
        path: 'messenger',
        loadComponent: () =>
          import('./components/collaboration/messenger/messenger.component')
            .then(m => m.MessengerComponent)
      },
      {
        path: 'groups',
        loadComponent: () =>
          import('./components/collaboration/groups-list/groups-list.component')
            .then(m => m.GroupsListComponent)
      }
    ]
  },

  // --- Dashboard Routes ---
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
  // ===== EXISTANT =====
  { path: 'collaboration', component: CommunicationTestComponent },

  // --- Dashboards ---
  { path: 'patient-dashboard', component: PatientDashboardComponent },
  { path: 'medecin-dashboard', component: MedecinDashboardComponent },

  // --- Routes Rendez-vous ---
  { path: 'rendezvous', component: RendezVousListComponent },
  { path: 'rendezvous/new', component: RendezVousFormComponent },
  { path: 'rendezvous/:id', component: RendezVousDetailComponent },
  { path: 'rendezvous/:id/edit', component: RendezVousFormComponent },

  // --- Routes Education ---
  { path: 'events', component: EventListComponent },
  { path: 'activities', component: ActivityListComponent },
  { path: 'education', component: EducationComponent },
  { path: 'eventfront', component: EventFrontComponent },

  { path: '**', redirectTo: 'auth/login' }
];