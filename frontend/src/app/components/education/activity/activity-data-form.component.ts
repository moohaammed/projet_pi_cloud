import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface QuizQuestion {
  texte: string;
  options: string[];
  reponse_correcte: number;
  explication: string;
}

export interface QuizData {
  questions: QuizQuestion[];
  timer: number;
}

export interface GameData {
  theme: 'animaux' | 'fleurs' | 'fruits' | 'transport';
  nombreCartes: 6 | 8 | 10 | 12;
  timer: number;
}

export interface ContentData {
  contentType: 'video' | 'article';
  videoUrl?: string;
  imageUrl?: string;
  langue?: string;
  description?: string;
}

export interface ExerciceEtape {
  num: number;
  consigne: string;
  dureeSecondes: number;
}

export interface ExerciceData {
  sousType: string;
  repetitions: number;
  etapes: ExerciceEtape[];
}

// ─── Composant ──────────────────────────────────────────────────────────────

@Component({
  selector: 'app-activity-data-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dynamic-form">

      <!-- ══════════════════ QUIZ ══════════════════ -->
      <ng-container *ngIf="activityType === 'QUIZ'">
        <div class="section-header border-bottom pb-2 mb-3 d-flex align-items-center">
          <span class="badge bg-success me-2">QUIZ</span>
          <span class="fw-bold">Configuration du Quiz</span>
          <div class="ms-auto d-flex align-items-center gap-2">
            <label class="mb-0 small fw-bold text-muted">Durée (minutes):</label>
            <input type="number" class="form-control form-control-sm" style="width: 70px;" 
                   [value]="quizData.timer / 60" 
                   (input)="updateQuizTimer($event)" min="1" max="10" />
          </div>
          <button type="button" class="btn btn-sm btn-outline-primary ms-3" (click)="addQuestion()">+ Question</button>
        </div>

        <div class="card mb-3 shadow-sm border-start border-success border-4" *ngFor="let q of quizData.questions; let i = index">
          <div class="card-body p-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="badge bg-secondary">Question {{ i + 1 }}</span>
              <button type="button" class="btn-close small" (click)="removeQuestion(i)"></button>
            </div>

            <div class="mb-2">
              <label class="form-label small fw-bold">Question</label>
              <input type="text" class="form-control form-control-sm" [value]="q.texte" (input)="updateQuestionText(i, $event)" />
            </div>

            <div class="mb-2">
              <label class="form-label small fw-bold">Options</label>
              <div class="row g-2">
                <div class="col-6" *ngFor="let opt of q.options; let j = index">
                  <div class="input-group input-group-sm">
                    <span class="input-group-text cursor-pointer" 
                          [class.bg-success]="q.reponse_correcte === j"
                          [class.text-white]="q.reponse_correcte === j"
                          (click)="setCorrectAnswer(i, j)">
                      {{ optionLetters[j] }}
                    </span>
                    <input type="text" class="form-control" [value]="opt" (input)="updateOption(i, j, $event)" />
                    <button class="btn btn-outline-danger" *ngIf="q.options.length > 2" (click)="removeOption(i, j)">✕</button>
                  </div>
                </div>
                <div class="col-6 d-flex align-items-center">
                   <button type="button" class="btn btn-sm btn-link p-0 text-decoration-none" (click)="addOption(i)" *ngIf="q.options.length < 6">+ Ajouter option</button>
                </div>
              </div>
            </div>

            <div>
              <label class="form-label small fw-bold">Explication (optionnel)</label>
              <textarea class="form-control form-control-sm" rows="2" [value]="q.explication" (input)="updateExplication(i, $event)"></textarea>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- ══════════════════ GAME ══════════════════ -->
      <ng-container *ngIf="activityType === 'GAME'">
        <div class="section-header border-bottom pb-2 mb-3 d-flex align-items-center">
          <span class="badge bg-primary me-2">GAME</span>
          <span class="fw-bold">Paramètres du Memory</span>
          <div class="ms-auto d-flex align-items-center gap-2">
            <label class="mb-0 small fw-bold text-muted">Durée (minutes):</label>
            <input type="number" class="form-control form-control-sm" style="width: 70px;" 
                   [value]="gameData.timer / 60" 
                   (input)="updateGameTimer($event)" min="1" max="10" />
          </div>
        </div>

        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label small fw-bold">Thème</label>
            <select class="form-select form-select-sm" [value]="gameData.theme" (change)="updateGameTheme($event)">
              <option value="animaux">Animaux</option>
              <option value="fleurs">Fleurs</option>
              <option value="fruits">Fruits</option>
              <option value="transport">Transport</option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label small fw-bold">Nombre de cartes</label>
            <select class="form-select form-select-sm" [value]="gameData.nombreCartes" (change)="updateGameCards($event)">
              <option [value]="6">6 (Trés facile)</option>
              <option [value]="8">8 (Facile)</option>
              <option [value]="10">10 (Moyen)</option>
              <option [value]="12">12 (Difficile)</option>
            </select>
          </div>
        </div>
      </ng-container>

      <!-- ══════════════════ CONTENT ══════════════════ -->
      <div *ngIf="activityType === 'CONTENT'" class="p-2">
         <p class="text-muted small">Contenu de type Article ou Vidéo.</p>
         <div class="mb-2">
            <label class="form-label small fw-bold">Source</label>
            <input type="text" class="form-control form-control-sm" placeholder="URL ou Texte..." (input)="emitChange()">
         </div>
      </div>

    </div>
  `,
  styles: [`
    .cursor-pointer { cursor: pointer; }
    .dynamic-form { background: #fff; padding: 10px; }
  `]
})
export class ActivityDataFormComponent implements OnInit, OnChanges {
  @Input() activityType: 'QUIZ' | 'GAME' | 'CONTENT' | 'EXERCICE' = 'QUIZ';
  @Input() initialData: any = '{}';
  @Input() globalTimerMinutes: number = 0;

  @Output() dataChange = new EventEmitter<string>();
  @Output() timerChange = new EventEmitter<number>();

  optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
  quizData: QuizData = { questions: [], timer: 120 };
  gameData: GameData = { theme: 'animaux', nombreCartes: 8, timer: 60 };
  private internalUpdate = false;

  constructor() { }

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialData'] && !this.internalUpdate) {
      this.loadInitialData();
    }
    if (changes['globalTimerMinutes']) {
      const newSec = Math.round(this.globalTimerMinutes * 60);
      if (newSec > 0) {
        if (this.activityType === 'QUIZ' && this.quizData.timer !== newSec) {
          this.quizData.timer = newSec;
          this.emitChange();
        } else if (this.activityType === 'GAME' && this.gameData.timer !== newSec) {
          this.gameData.timer = newSec;
          this.emitChange();
        }
      }
    }
  }

  private loadInitialData(): void {
    try {
      const parsed = (typeof this.initialData === 'string')
        ? JSON.parse(this.initialData || '{}')
        : (this.initialData || {});
      
      // Calculate initial timer from global if available, otherwise from parsed data, otherwise default
      const initialTimer = (this.globalTimerMinutes > 0) 
        ? Math.round(this.globalTimerMinutes * 60)
        : (parsed.timer || (this.activityType === 'QUIZ' ? 120 : 60));

      if (this.activityType === 'QUIZ') {
        this.quizData = {
          questions: parsed.questions || [],
          timer: initialTimer
        };
      } else if (this.activityType === 'GAME') {
        this.gameData = {
          theme: parsed.theme || 'animaux',
          nombreCartes: parsed.nombreCartes || 8,
          timer: initialTimer
        };
      }
      
      // If we adjusted the timer on load, emit the change to keep parent JSON in sync
      if (parsed.timer !== initialTimer) {
        this.emitChange();
      }
    } catch (e) {
      console.error('JSON Parse Error', e);
    }
  }

  addQuestion(): void {
    this.quizData.questions.push({ texte: '', options: ['', ''], reponse_correcte: 0, explication: '' });
    this.emitChange();
  }

  removeQuestion(idx: number): void {
    this.quizData.questions.splice(idx, 1);
    this.emitChange();
  }

  updateQuestionText(idx: number, event: any): void {
    this.quizData.questions[idx].texte = event.target.value;
    this.emitChange();
  }

  addOption(idx: number): void {
    if (this.quizData.questions[idx].options.length < 6) {
      this.quizData.questions[idx].options.push('');
      this.emitChange();
    }
  }

  removeOption(qIdx: number, oIdx: number): void {
    this.quizData.questions[qIdx].options.splice(oIdx, 1);
    if (this.quizData.questions[qIdx].reponse_correcte >= this.quizData.questions[qIdx].options.length) {
      this.quizData.questions[qIdx].reponse_correcte = 0;
    }
    this.emitChange();
  }

  updateOption(qIdx: number, oIdx: number, event: any): void {
    this.quizData.questions[qIdx].options[oIdx] = event.target.value;
    this.emitChange();
  }

  setCorrectAnswer(qIdx: number, oIdx: number): void {
    this.quizData.questions[qIdx].reponse_correcte = oIdx;
    this.emitChange();
  }

  updateExplication(idx: number, event: any): void {
    this.quizData.questions[idx].explication = event.target.value;
    this.emitChange();
  }

  updateQuizTimer(event: any): void {
    const mins = parseFloat(event.target.value) || 0;
    this.quizData.timer = Math.round(mins * 60);
    this.timerChange.emit(mins);
    this.emitChange();
  }

  updateGameTimer(event: any): void {
    const mins = parseFloat(event.target.value) || 0;
    this.gameData.timer = Math.round(mins * 60);
    this.timerChange.emit(mins);
    this.emitChange();
  }

  updateGameTheme(event: any): void {
    this.gameData.theme = event.target.value;
    this.emitChange();
  }

  updateGameCards(event: any): void {
    this.gameData.nombreCartes = parseInt(event.target.value, 10) as any;
    this.emitChange();
  }

  emitChange(): void {
    this.internalUpdate = true;
    const data = this.activityType === 'QUIZ' ? this.quizData : this.gameData;
    this.dataChange.emit(JSON.stringify(data));
    setTimeout(() => this.internalUpdate = false);
  }
}