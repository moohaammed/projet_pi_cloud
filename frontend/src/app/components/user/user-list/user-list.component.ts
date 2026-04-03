import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AlzUserService } from '../../../services/alz-user.service';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './user-list.component.html'
})
export class UserListComponent implements OnInit {

  users: User[] = [];
  loading = false;

  constructor(private alzUserService: AlzUserService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.alzUserService.getAll().subscribe({
      next: (data) => { this.users = data; this.loading = false; },
      error: () => this.loading = false
    });
  }

  toggleActif(id: number): void {
    this.alzUserService.toggleActif(id).subscribe({
      next: () => this.load()
    });
  }

  delete(id: number): void {
    if (confirm('Supprimer cet utilisateur ?')) {
      this.alzUserService.delete(id).subscribe({
        next: () => this.load()
      });
    }
  }
}