import { Routes } from '@angular/router';

// Imports de ton ami (Rendez-vous & Education)
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
  // --- Tes Routes (Gestion Patient) ---
  { path: 'patients', component: GestionPatientRoleComponent },
  { path: 'patient-dashboard', component: PatientDashboardComponent },
  { path: 'medecin-dashboard', component: MedecinDashboardComponent },
  { path: 'collaboration', component: CommunicationTestComponent },

  // --- Routes de l'ami (Rendez-vous) ---
  { path: 'rendezvous', component: RendezVousListComponent },
  { path: 'rendezvous/new', component: RendezVousFormComponent },
  { path: 'rendezvous/:id', component: RendezVousDetailComponent },
  { path: 'rendezvous/:id/edit', component: RendezVousFormComponent },

  // --- Routes Education ---
  { path: 'events', component: EventListComponent },
  { path: 'activities', component: ActivityListComponent },
  { path: 'education', component: EducationComponent },
  { path: 'eventfront', component: EventFrontComponent },

  // --- Redirections et Wildcard (À mettre à la fin !) ---
  { path: '', redirectTo: 'patients', pathMatch: 'full' },
  { path: '**', redirectTo: 'patients' }
];
