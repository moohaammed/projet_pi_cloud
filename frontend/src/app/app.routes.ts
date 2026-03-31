import { Routes } from '@angular/router';
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
];
