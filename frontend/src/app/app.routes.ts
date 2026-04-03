import { Routes } from '@angular/router';
import { CommunicationTestComponent } from './components/collaboration/communication-test/communication-test.component';
import { FeedComponent } from './components/collaboration/feed/feed.component';
import { MessengerComponent } from './components/collaboration/messenger/messenger.component';
import { GroupsListComponent } from './components/collaboration/groups-list/groups-list.component';

export const routes: Routes = [
    { path: 'collaboration', component: CommunicationTestComponent },
    { path: 'collaboration/feed', component: FeedComponent },
    { path: 'collaboration/messenger', component: MessengerComponent },
    { path: 'collaboration/groups', component: GroupsListComponent },
    { path: '', redirectTo: '/collaboration/feed', pathMatch: 'full' }
];
