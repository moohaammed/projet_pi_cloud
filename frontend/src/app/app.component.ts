import { Component } from '@angular/core';
<<<<<<< rendezvous
import { RouterModule } from '@angular/router';
=======
import { RouterOutlet, RouterLink } from '@angular/router';
>>>>>>> main

@Component({
  selector: 'app-root',
  standalone: true,
<<<<<<< rendezvous
  imports: [RouterModule],
=======
  imports: [RouterOutlet, RouterLink],
>>>>>>> main
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'MediSync';
  navOpen = false;
}
