import { Routes } from '@angular/router';
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
];
