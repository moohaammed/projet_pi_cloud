import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivityService } from '../../../services/education/activity.service';
import { ActivityModel } from '../../../models/education/activity.model';
import { ActivityDataFormComponent } from './activity-data-form.component';

@Component({
  selector: 'app-activity-list',
  templateUrl: './activity-list.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, ActivityDataFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivityListComponent implements OnInit {

  activities: ActivityModel[] = [];
  selected: ActivityModel | null = null;
  isEditing = false;
  filterType = '';

  errors: { [key: string]: string } = {};

  newActivity: ActivityModel = {
    title: '',
    type: 'QUIZ',
    stade: 'LEGER',
    description: '',
    data: '{}',
    estimatedMinutes: 5,
    active: true
  };

  constructor(private activityService: ActivityService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.activityService.getAll().subscribe(data => {
      this.activities = data;
      this.cdr.markForCheck();
    });
  }

  loadByType(type: string): void {
    this.filterType = type;

    if (!type) {
      this.load();
      return;
    }

    this.activityService.getByType(type).subscribe(data => {
      this.activities = data;
      this.cdr.markForCheck();
    });
  }

  onDataChange(jsonString: string): void {
    this.newActivity = { ...this.newActivity, data: jsonString };
    this.cdr.markForCheck();
  }

  validate(): boolean {
    this.errors = {};

    const title = this.newActivity.title?.trim();
    if (!title) {
      this.errors['title'] = 'Le titre est obligatoire.';
    } else if (title.length < 3) {
      this.errors['title'] = 'Le titre doit contenir au moins 3 caractères.';
    } else if (title.length > 100) {
      this.errors['title'] = 'Le titre ne doit pas dépasser 100 caractères.';
    }

    const desc = this.newActivity.description?.trim();
    if (!desc) {
      this.errors['description'] = 'La description est obligatoire.';
    } else if (desc.length > 500) {
      this.errors['description'] = 'La description ne doit pas dépasser 500 caractères.';
    }

    const minutes = this.newActivity.estimatedMinutes;
    if (minutes === null || minutes === undefined) {
      this.errors['estimatedMinutes'] = 'La durée est obligatoire.';
    } else if (minutes < 1) {
      this.errors['estimatedMinutes'] = 'La durée doit être d\'au moins 1 minute.';
    } else if (minutes > 300) {
      this.errors['estimatedMinutes'] = 'La durée ne doit pas dépasser 300 minutes.';
    }

    return Object.keys(this.errors).length === 0;
  }

  save(): void {
    if (!this.validate()) return;

    if (this.isEditing && this.selected?.id) {
      this.activityService.update(this.selected.id, this.newActivity)
        .subscribe(() => {
          this.load();
          this.reset();
        });
    } else {
      this.activityService.create(this.newActivity)
        .subscribe(() => {
          this.load();
          this.reset();
        });
    }
  }

  edit(activity: ActivityModel): void {
    this.selected = activity;
    this.newActivity = { ...activity };
    this.isEditing = true;
    this.errors = {};
    this.cdr.markForCheck();
  }

  delete(id: number): void {
    this.activityService.delete(id).subscribe(() => {
      this.load();
    });
  }

  reset(): void {
    this.newActivity = {
      title: '',
      type: 'QUIZ',
      stade: 'LEGER',
      description: '',
      data: '{}',
      estimatedMinutes: 5,
      active: true
    };
    this.selected = null;
    this.isEditing = false;
    this.errors = {};
    this.cdr.markForCheck();
  }

  getBadgeClass(type: string): string {
    const map: Record<string, string> = {
      QUIZ: 'badge bg-success',
      GAME: 'badge bg-primary',
      CONTENT: 'badge bg-warning text-dark',
      EXERCICE: 'badge bg-danger'
    };

    return map[type] || 'badge bg-secondary';
  }
}