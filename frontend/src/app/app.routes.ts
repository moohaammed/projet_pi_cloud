import { Routes } from '@angular/router';

// Imports from rendezvous
import { RendezVousListComponent } from './components/rendezvous-list/rendezvous-list.component';
import { RendezVousFormComponent } from './components/rendezvous-form/rendezvous-form.component';
import { RendezVousDetailComponent } from './components/rendezvous-detail/rendezvous-detail.component';

// Imports from main
import { EventListComponent } from './components/education/event/event-list.component';
import { ActivityListComponent } from './components/education/activity/activity-list.component';
import { EducationComponent } from './components/education/activity/education.component';
import { EventFrontComponent } from './components/education/event/event_front';
import { CommunicationTestComponent } from './components/collaboration/communication-test/communication-test.component';
import { FeedComponent } from './components/collaboration/feed/feed.component';
import { MessengerComponent } from './components/collaboration/messenger/messenger.component';
import { GroupsListComponent } from './components/collaboration/groups-list/groups-list.component';

export const routes: Routes = [
  { path: 'collaboration', component: CommunicationTestComponent },
  { path: 'collaboration/feed', component: FeedComponent },
  { path: 'collaboration/messenger', component: MessengerComponent },
  { path: 'collaboration/groups', component: GroupsListComponent },
  { path: 'rendezvous', component: RendezVousListComponent },
  { path: 'rendezvous/new', component: RendezVousFormComponent },
  { path: 'rendezvous/:id', component: RendezVousDetailComponent },
  { path: 'rendezvous/:id/edit', component: RendezVousFormComponent },
  { path: 'events', component: EventListComponent },
  { path: 'activities', component: ActivityListComponent },
  { path: 'education', component: EducationComponent },
  { path: 'eventfront', component: EventFrontComponent },

  { path: '**', redirectTo: 'rendezvous' }
];
