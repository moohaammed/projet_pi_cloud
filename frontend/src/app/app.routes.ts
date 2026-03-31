import { Routes } from '@angular/router';
<<<<<<< rendezvous
import { RendezVousListComponent } from './components/rendezvous-list/rendezvous-list.component';
import { RendezVousFormComponent } from './components/rendezvous-form/rendezvous-form.component';
import { RendezVousDetailComponent } from './components/rendezvous-detail/rendezvous-detail.component';

export const routes: Routes = [
  { path: '', redirectTo: 'rendezvous', pathMatch: 'full' },
  { path: 'rendezvous', component: RendezVousListComponent },
  { path: 'rendezvous/new', component: RendezVousFormComponent },
  { path: 'rendezvous/:id', component: RendezVousDetailComponent },
  { path: 'rendezvous/:id/edit', component: RendezVousFormComponent },
  { path: '**', redirectTo: 'rendezvous' }
=======
import { EventListComponent } from './components/education/event/event-list.component'; 
import { ActivityListComponent } from './components/education/activity/activity-list.component';
import { EducationComponent } from './components/education/activity/education.component';
import { EventFrontComponent } from './components/education/event/event_front';
import { CommunicationTestComponent } from './components/collaboration/communication-test/communication-test.component';

export const routes: Routes = [
    { path: 'collaboration', component: CommunicationTestComponent },
    { path: 'events', component: EventListComponent },
     { path: 'activities', component: ActivityListComponent },
      {  path: 'education', component: EducationComponent },
       { path: 'eventfront', component: EventFrontComponent }
>>>>>>> main
];
