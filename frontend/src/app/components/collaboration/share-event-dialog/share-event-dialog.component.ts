import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PublicationService } from '../../../services/collaboration/publication.service';
import { AuthService } from '../../../services/auth.service';

/** Minimal event shape so education module does not need to import this component’s types. */
export interface ShareableCalendarEvent {
  id?: number;
  title?: string;
  startDateTime?: string;
  location?: string;
  description?: string;
  imageUrl?: string;
}

@Component({
  selector: 'app-share-event-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './share-event-dialog.component.html',
  styleUrl: './share-event-dialog.component.scss',
})
export class ShareEventDialogComponent implements OnChanges {
  private publicationService = inject(PublicationService);
  private authService = inject(AuthService);

  @Input() open = false;
  @Output() openChange = new EventEmitter<boolean>();

  @Input() event: ShareableCalendarEvent | null = null;

  note = '';
  submitting = signal(false);
  error = signal<string | null>(null);
  success = signal(false);

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['open']?.currentValue === true) {
      this.note = '';
      this.error.set(null);
      this.success.set(false);
      this.submitting.set(false);
    }
  }

  close(): void {
    this.reset();
    this.openChange.emit(false);
  }

  private reset(): void {
    this.note = '';
    this.error.set(null);
    this.success.set(false);
    this.submitting.set(false);
  }

  submit(): void {
    const e = this.event;
    if (!e?.title?.trim()) return;
    if (e.id == null) {
      this.error.set('This event has no id; save it before sharing.');
      return;
    }

    const uid = this.authService.getCurrentUser()?.id ?? 1;

    this.submitting.set(true);
    this.error.set(null);

    this.publicationService
      .createPublication({
        content: this.note.trim(),
        type: 'EVENT',
        authorId: uid,
        anonymous: false,
        linkedEventId: e.id,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.success.set(true);
          this.publicationService.fetchPersonalizedFeed(uid);
        },
        error: (err: { error?: unknown; message?: string }) => {
          this.submitting.set(false);
          const body = err.error;
          const msg =
            typeof body === 'string'
              ? body
              : (body as { message?: string })?.message || err.message || 'Could not publish to the feed.';
          this.error.set(msg);
        },
      });
  }
}
