import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HelpNotificationService } from '../../services/help-notification.service';
import { PatientContact, RelationType } from '../../models/patient-contact.model';

@Component({
  selector: 'app-help-notification-contacts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './help-notification-contacts.component.html',
  styleUrl: './help-notification-contacts.component.css'
})
export class HelpNotificationContactsComponent implements OnInit {
  private auth = inject(AuthService);
  private helpService = inject(HelpNotificationService);

  contacts: PatientContact[] = [];
  isLoading = false;
  isSending = false;

  // Form state
  showForm = false;
  isEditing = false;
  formContact: PatientContact = this.emptyContact();

  // Messages
  successMessage = '';
  errorMessage = '';

  // Relation type options
  relationTypes = [
    { value: RelationType.DOCTOR, label: 'Doctor' },
    { value: RelationType.PARENT, label: 'Parent' },
    { value: RelationType.CAREGIVER, label: 'Caregiver' },
    { value: RelationType.RELATION, label: 'Relation' }
  ];

  ngOnInit(): void {
    this.loadContacts();
  }

  get userId(): number | null {
    const user = this.auth.getCurrentUser();
    return user?.id || null;
  }

  loadContacts(): void {
    if (!this.userId) return;
    this.isLoading = true;
    this.helpService.getContacts(this.userId).subscribe({
      next: (data) => {
        this.contacts = data || [];
        this.isLoading = false;
      },
      error: (err) => {
        this.showError('Failed to load contacts.');
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  openAddForm(): void {
    this.formContact = this.emptyContact();
    this.isEditing = false;
    this.showForm = true;
    this.clearMessages();
  }

  openEditForm(contact: PatientContact): void {
    this.formContact = { ...contact };
    this.isEditing = true;
    this.showForm = true;
    this.clearMessages();
  }

  cancelForm(): void {
    this.showForm = false;
    this.formContact = this.emptyContact();
    this.clearMessages();
  }

  saveContact(): void {
    if (!this.userId) return;
    if (!this.formContact.relationType) {
      this.showError('Relation type is required.');
      return;
    }

    if (this.isEditing && this.formContact.id) {
      this.helpService.updateContact(this.userId, this.formContact.id, this.formContact).subscribe({
        next: () => {
          this.showSuccess('Contact updated successfully.');
          this.showForm = false;
          this.loadContacts();
        },
        error: (err) => {
          this.showError(err?.error?.message || 'Failed to update contact.');
        }
      });
    } else {
      this.helpService.createContact(this.userId, this.formContact).subscribe({
        next: () => {
          this.showSuccess('Contact added successfully.');
          this.showForm = false;
          this.loadContacts();
        },
        error: (err) => {
          this.showError(err?.error?.message || 'Failed to add contact.');
        }
      });
    }
  }

  deleteContact(contact: PatientContact): void {
    if (!this.userId || !contact.id) return;
    if (!confirm(`Are you sure you want to delete ${contact.prenom} ${contact.nom}?`)) return;

    this.helpService.deleteContact(this.userId, contact.id).subscribe({
      next: () => {
        this.showSuccess('Contact deleted.');
        this.loadContacts();
      },
      error: (err) => {
        this.showError(err?.error?.message || 'Failed to delete contact.');
      }
    });
  }

  sendHelpNotification(): void {
    if (!this.userId) return;
    if (this.contacts.length === 0) {
      this.showError('No contacts to notify. Please add contacts first.');
      return;
    }
    if (!confirm('Send a help notification to all your emergency contacts?')) return;

    this.isSending = true;
    this.helpService.sendHelpNotification(this.userId).subscribe({
      next: (res) => {
        this.showSuccess(
          `Help notification sent! ${res.platformNotificationsSent || 0} in-platform, ${res.emailsSent || 0} emails.`
        );
        this.isSending = false;
      },
      error: (err) => {
        this.showError(err?.error?.message || 'Failed to send help notification.');
        this.isSending = false;
      }
    });
  }

  getRelationLabel(type: string): string {
    const found = this.relationTypes.find(r => r.value === type);
    return found ? found.label : type;
  }

  getRelationBadgeClass(type: string): string {
    switch (type) {
      case 'DOCTOR': return 'badge-doctor';
      case 'PARENT': return 'badge-parent';
      case 'CAREGIVER': return 'badge-caregiver';
      case 'RELATION': return 'badge-relation';
      default: return '';
    }
  }

  private emptyContact(): PatientContact {
    return {
      relationType: RelationType.DOCTOR,
      nom: '',
      prenom: '',
      email: '',
      telephone: ''
    };
  }

  private showSuccess(msg: string): void {
    this.successMessage = msg;
    this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 5000);
  }

  private showError(msg: string): void {
    this.errorMessage = msg;
    this.successMessage = '';
    setTimeout(() => this.errorMessage = '', 6000);
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }
}
