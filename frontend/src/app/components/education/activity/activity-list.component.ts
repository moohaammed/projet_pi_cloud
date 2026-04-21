import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, ViewChildren, QueryList, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivityService } from '../../../services/education/activity.service';
import { ActivityModel } from '../../../models/education/activity.model';
import { ActivityDataFormComponent } from './activity-data-form.component';
import { Chart, registerables } from 'chart.js';

@Component({
  selector: 'app-activity-list',
  templateUrl: './activity-list.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, ActivityDataFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivityListComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChildren('chartCanvas') chartCanvases!: QueryList<ElementRef<HTMLCanvasElement>>;
  charts: Chart[] = [];

  allActivities: ActivityModel[] = [];
  selected: ActivityModel | null = null;
  isEditing = false;
  showForm = false;
  filterType = '';
  searchTerm = '';

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

  constructor(private activityService: ActivityService, private cdr: ChangeDetectorRef) { 
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.load();
  }

  ngAfterViewInit(): void {
    setTimeout(() => { if (this.allActivities.length > 0) this.buildCharts(); }, 500);
  }

  ngOnDestroy(): void {
    this.charts.forEach(c => c.destroy());
  }

  load(): void {
    this.activityService.getAll().subscribe({
      next: (data) => {
        this.allActivities = data;
        if (this.chartCanvases && this.chartCanvases.length > 0) {
          this.buildCharts();
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        const msg = err.error?.message || err.message || 'Erreur lors du chargement des activités';
        alert(msg);
      }
    });
  }

  get filteredActivities(): ActivityModel[] {
    return this.allActivities.filter(a => {
      const matchesType = !this.filterType || a.type === this.filterType;
      const term = this.searchTerm.toLowerCase().trim();
      const matchesSearch = !term || 
                           a.title?.toLowerCase().includes(term) || 
                           a.description?.toLowerCase().includes(term) ||
                           a.id?.toString().includes(term);
      return matchesType && matchesSearch;
    });
  }

  loadByType(type: string): void {
    this.filterType = type;
    this.cdr.markForCheck();
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

    return Object.keys(this.errors).length === 0;
  }

  save(): void {
    if (!this.validate()) return;

    if (this.isEditing && this.selected?.id) {
      this.activityService.update(this.selected.id, this.newActivity)
        .subscribe({
          next: () => {
            this.load();
            this.reset();
          },
          error: (err) => {
            const msg = err.error?.message || err.message || 'Erreur lors de la modification';
            alert(msg);
          }
        });
    } else {
      this.activityService.create(this.newActivity)
        .subscribe({
          next: () => {
            this.load();
            this.reset();
          },
          error: (err) => {
            const msg = err.error?.message || err.message || 'Erreur lors de la création';
            alert(msg);
          }
        });
    }
  }

  edit(activity: ActivityModel): void {
    this.selected = activity;
    this.newActivity = { ...activity };
    this.isEditing = true;
    this.showForm = true;
    this.errors = {};
    this.cdr.markForCheck();
  }

  delete(id: string): void {
    if (confirm('Voulez-vous vraiment supprimer cette activité ?')) {
      this.activityService.delete(id).subscribe({
        next: () => {
          this.load();
        },
        error: (err) => {
          const msg = err.error?.message || err.message || 'Erreur lors de la suppression';
          alert(msg);
        }
      });
    }
  }

  onTimerChange(minutes: number): void {
    if (this.newActivity.estimatedMinutes !== minutes) {
      this.newActivity = { ...this.newActivity, estimatedMinutes: minutes };
      this.cdr.markForCheck();
    }
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
    this.showForm = false;
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

  // --- Stats Getters ---
  get totalActivities(): number { return this.allActivities.length; }
  get activeCount():     number { return this.allActivities.filter(a => a.active).length; }
  get inactiveCount():   number { return this.allActivities.filter(a => !a.active).length; }
  get quizCount():       number { return this.allActivities.filter(a => a.type === 'QUIZ').length; }
  get gameCount():       number { return this.allActivities.filter(a => a.type === 'GAME').length; }
  get contentCount():    number { return this.allActivities.filter(a => a.type === 'CONTENT').length; }
  get exerciceCount():   number { return this.allActivities.filter(a => a.type === 'EXERCICE').length; }
  get legerCount():      number { return this.allActivities.filter(a => a.stade === 'LEGER').length; }
  get modereCount():     number { return this.allActivities.filter(a => a.stade === 'MODERE').length; }
  get severeCount():     number { return this.allActivities.filter(a => a.stade === 'SEVERE').length; }

  // ==== CHARTS ====
  private buildCharts(): void {
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    if (!this.chartCanvases) return;
    const canvases = this.chartCanvases.toArray();
    if (canvases.length === 0) return;

    // 1. Répartition par Type (Pie)
    if (canvases[0]) {
      const ctx1 = canvases[0].nativeElement;
      this.charts.push(new Chart(ctx1, {
        type: 'doughnut',
        data: {
          labels: ['Quiz', 'Jeux', 'Contenus', 'Exercices'],
          datasets: [{
            data: [this.quizCount, this.gameCount, this.contentCount, this.exerciceCount],
            backgroundColor: ['#059669', '#6c2bd9', '#d97706', '#e11d48'],
            borderWidth: 0
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      }));
    }

    // 2. Répartition par Stade (Pie)
    if (canvases[1]) {
      const ctx2 = canvases[1].nativeElement;
      this.charts.push(new Chart(ctx2, {
        type: 'pie',
        data: {
          labels: ['Léger', 'Modéré', 'Sévère'],
          datasets: [{
            data: [this.legerCount, this.modereCount, this.severeCount],
            backgroundColor: ['#9333ea', '#7c3aed', '#6d28d9'],
            borderWidth: 0
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      }));
    }

    // 3. Statut (Bar ou Doughnut)
    if (canvases[2]) {
      const ctx3 = canvases[2].nativeElement;
      this.charts.push(new Chart(ctx3, {
        type: 'doughnut',
        data: {
          labels: ['Actives', 'Inactives'],
          datasets: [{
            data: [this.activeCount, this.inactiveCount],
            backgroundColor: ['#10b981', '#94a3b8'],
            borderWidth: 0
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
      }));
    }
    this.cdr.markForCheck();
  }
}