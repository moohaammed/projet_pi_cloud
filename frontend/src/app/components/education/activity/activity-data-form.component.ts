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
    <div class="dynamic-form animate-fade-in">

      <!-- ══════════════════ QUIZ ══════════════════ -->
      <ng-container *ngIf="activityType === 'QUIZ'">
        <div class="d-flex align-items-center justify-content-between mb-4 pb-3 border-bottom border-black border-opacity-10">
          <div class="d-flex align-items-center">
            <div class="bg-soft-success text-success p-2 rounded-3 me-3">
              <i class="fa-solid fa-clipboard-question fs-5"></i>
            </div>
            <div>
              <h6 class="mb-0 fw-bold text-dark">Quiz Configuration</h6>
              <p class="text-muted small mb-0">{{ quizData.questions.length }} questions configured</p>
            </div>
          </div>
          <div class="d-flex align-items-center gap-3">
            <div class="d-flex align-items-center gap-2">
              <span class="small fw-bold text-muted text-uppercase" style="font-size: 10px;">Time (min)</span>
              <input type="number" class="form-control form-control-sm bg-light border-0 rounded-pill px-3 shadow-sm text-center fw-bold" 
                     style="width: 60px;" [value]="quizData.timer / 60" (input)="updateQuizTimer($event)" min="1" max="10" />
            </div>
            <button type="button" class="btn btn-primary btn-sm fw-bold rounded-pill px-3 shadow-sm transition-all" (click)="addQuestion()">
              <i class="fa-solid fa-plus me-1"></i> Question
            </button>
          </div>
        </div>

        <div class="card border-0 bg-white rounded-4 shadow-sm mb-4 overflow-hidden animate-fade-in" 
             *ngFor="let q of quizData.questions; let i = index; trackBy: trackByIndex">
          <div class="card-header bg-soft-light border-0 p-3 d-flex justify-content-between align-items-center">
            <span class="badge bg-white shadow-sm text-dark px-3 py-2 rounded-pill fw-bold border" style="font-size: 11px;">
              <i class="fa-solid fa-hashtag text-primary me-1"></i> Question {{ i + 1 }}
            </span>
            <button type="button" class="btn btn-sm btn-white text-danger shadow-sm rounded-circle p-1 px-2 border" (click)="removeQuestion(i)">
              <i class="fa-solid fa-trash-can small"></i>
            </button>
          </div>
          <div class="card-body p-4 pt-3">
            <div class="mb-4">
              <label class="form-label fw-bold text-muted small text-uppercase">Question Title</label>
              <input type="text" class="form-control bg-light border-0 rounded-3 px-3 py-2 shadow-sm" 
                     [value]="q.texte" (input)="updateQuestionText(i, $event)" 
                     placeholder="Type your question here..." />
            </div>

            <div class="mb-4">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <label class="form-label fw-bold text-muted small text-uppercase mb-0">Choices (Check the correct answer)</label>
                <button type="button" class="btn btn-link btn-sm text-decoration-none fw-bold p-0" 
                        (click)="addOption(i)" *ngIf="q.options.length < 6">
                  <i class="fa-solid fa-plus-circle me-1"></i> Add a choice
                </button>
              </div>
              <div class="row g-3">
                <div class="col-md-6" *ngFor="let opt of q.options; let j = index; trackBy: trackByIndex">
                  <div class="input-group shadow-sm rounded-pill overflow-hidden border-0">
                    <span class="input-group-text cursor-pointer transition-all border-0 px-3" 
                          [class.bg-primary]="q.reponse_correcte === j"
                          [class.text-white]="q.reponse_correcte === j"
                          [class.bg-white]="q.reponse_correcte !== j"
                          (click)="setCorrectAnswer(i, j)">
                      <i class="fa-solid fa-check fs-12" *ngIf="q.reponse_correcte === j"></i>
                      <span class="fw-bold fs-12" *ngIf="q.reponse_correcte !== j">{{ optionLetters[j] }}</span>
                    </span>
                    <input type="text" class="form-control border-0 bg-light px-3 py-2 small" 
                           [value]="opt" (input)="updateOption(i, j, $event)" placeholder="Option..." />
                    <button class="btn btn-light border-0 text-muted px-2" 
                            *ngIf="q.options.length > 2" (click)="removeOption(i, j)">
                      <i class="fa-solid fa-xmark small"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label class="form-label fw-bold text-muted small text-uppercase">Pedagogical explanation (Shown after answering)</label>
              <textarea class="form-control bg-light border-0 rounded-3 p-3 shadow-sm small" 
                        rows="2" [value]="q.explication" (input)="updateExplication(i, $event)"
                        placeholder="Explain why this is the correct answer..."></textarea>
            </div>
          </div>
        </div>

        <div *ngIf="quizData.questions.length === 0" class="text-center py-5 border-2 border-dashed rounded-4 bg-light text-muted">
           <i class="fa-solid fa-plus-circle fs-2 opacity-25 mb-2 d-block"></i>
           Click "Question" to start your quiz.
        </div>
      </ng-container>

      <!-- ══════════════════ GAME ══════════════════ -->
      <ng-container *ngIf="activityType === 'GAME'">
        <div class="d-flex align-items-center justify-content-between mb-4 pb-3 border-bottom border-black border-opacity-10">
          <div class="d-flex align-items-center">
            <div class="bg-soft-primary text-primary p-2 rounded-3 me-3">
              <i class="fa-solid fa-puzzle-piece fs-5"></i>
            </div>
            <div>
              <h6 class="mb-0 fw-bold text-dark">Memory Settings</h6>
              <p class="text-muted small mb-0">Define the game rules</p>
            </div>
          </div>
          <div class="d-flex align-items-center gap-2">
            <span class="small fw-bold text-muted text-uppercase" style="font-size: 10px;">Timer (min)</span>
            <input type="number" class="form-control form-control-sm bg-light border-0 rounded-pill px-3 shadow-sm text-center fw-bold" 
                   style="width: 60px;" [value]="gameData.timer / 60" (input)="updateGameTimer($event)" min="1" max="10" />
          </div>
        </div>

        <div class="row g-4 mb-4">
          <div class="col-md-6">
            <div class="card border-0 bg-light p-4 rounded-4 shadow-sm h-100">
              <label class="form-label fw-bold text-muted small text-uppercase mb-3"><i class="fa-solid fa-palette me-2 text-primary"></i>Visual Universe</label>
              <select class="form-select border-0 bg-white rounded-3 p-3 shadow-sm fw-bold text-dark" [value]="gameData.theme" (change)="updateGameTheme($event)">
                <option value="animaux">🐘 Wild Animals</option>
                <option value="fleurs">🌸 Flower Garden</option>
                <option value="fruits">🍎 Fruit Basket</option>
                <option value="transport">🚗 Means of Transport</option>
              </select>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card border-0 bg-light p-4 rounded-4 shadow-sm h-100">
              <label class="form-label fw-bold text-muted small text-uppercase mb-3"><i class="fa-solid fa-layer-group me-2 text-primary"></i>Number of Pairs</label>
              <select class="form-select border-0 bg-white rounded-3 p-3 shadow-sm fw-bold text-dark" [value]="gameData.nombreCartes" (change)="updateGameCards($event)">
                <option [value]="6">6 (Very easy - Beginner)</option>
                <option [value]="8">8 (Easy - Standard)</option>
                <option [value]="10">10 (Medium - Challenge)</option>
                <option [value]="12">12 (Hard - Expert)</option>
              </select>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- ══════════════════ CONTENT ══════════════════ -->
      <ng-container *ngIf="activityType === 'CONTENT'">
         <div class="d-flex align-items-center mb-4 pb-3 border-bottom border-black border-opacity-10">
            <div class="bg-soft-warning text-dark p-2 rounded-3 me-3">
              <i class="fa-solid fa-display fs-5"></i>
            </div>
            <div>
              <h6 class="mb-0 fw-bold text-dark">Content Information</h6>
              <p class="text-muted small mb-0">Integrate a video or an external article</p>
            </div>
         </div>

         <div class="card border-0 bg-light p-4 rounded-4 shadow-sm mb-4">
           <div class="mb-4">
              <label class="form-label fw-bold text-muted small text-uppercase"><i class="fa-solid fa-link me-2 text-warning"></i>Source (URL or Link)</label>
              <input type="text" class="form-control border-0 bg-white rounded-3 p-3 shadow-sm" 
                     [value]="contentData.videoUrl" 
                     placeholder="Paste content URL here (e.g.: https://youtube.com/...)" 
                     (input)="updateContentSource($event)">
           </div>
         </div>
      </ng-container>

      <!-- ══════════════════ EXERCICE ══════════════════ -->
      <ng-container *ngIf="activityType === 'EXERCICE'">
        <div class="d-flex align-items-center justify-content-between mb-4 pb-3 border-bottom border-black border-opacity-10">
          <div class="d-flex align-items-center">
            <div class="bg-soft-danger text-danger p-2 rounded-3 me-3">
              <i class="fa-solid fa-person-running fs-5"></i>
            </div>
            <div>
              <h6 class="mb-0 fw-bold text-dark">Exercise Sequence</h6>
              <p class="text-muted small mb-0">{{ exerciceData.etapes.length }} steps programmed</p>
            </div>
          </div>
          <button type="button" class="btn btn-dark btn-sm fw-bold rounded-pill px-3 shadow-sm " (click)="addEtape()">
             <i class="fa-solid fa-plus me-1"></i> Step
          </button>
        </div>

        <div class="row g-3 mb-4">
          <div class="col-md-6">
            <div class="bg-light p-3 rounded-4 shadow-sm border-0">
               <label class="form-label fw-bold text-muted small text-uppercase mb-2">Exercise sub-type</label>
               <input type="text" class="form-control border-0 bg-white rounded-3 p-2 shadow-sm" 
                      [value]="exerciceData.sousType" (input)="updateExerciceSousType($event)" 
                      placeholder="e.g.: Breathing, Physical..." />
            </div>
          </div>
          <div class="col-md-6">
            <div class="bg-light p-3 rounded-4 shadow-sm border-0">
               <label class="form-label fw-bold text-muted small text-uppercase mb-2">Number of repetitions</label>
               <input type="number" class="form-control border-0 bg-white rounded-3 p-2 shadow-sm fw-bold" 
                      [value]="exerciceData.repetitions" (input)="updateExerciceRepetitions($event)" min="1" />
            </div>
          </div>
        </div>

        <div class="card border-0 bg-white rounded-4 shadow-sm mb-3 overflow-hidden animate-fade-in border-start border-danger border-5" 
             *ngFor="let e of exerciceData.etapes; let idx = index; trackBy: trackByIndex">
          <div class="card-body p-4 d-flex align-items-center gap-3">
            <div class="bg-light text-dark rounded-circle fw-bold d-flex align-items-center justify-content-center border" style="width: 40px; height: 40px; min-width: 40px;">
               {{ idx + 1 }}
            </div>
            <div class="flex-grow-1">
              <div class="row g-3 align-items-center">
                <div class="col-md-8">
                  <label class="form-label fw-bold text-muted small text-uppercase mb-0" style="font-size: 10px;">Instruction for this step</label>
                  <input type="text" class="form-control border-0 bg-light p-2 shadow-sm rounded-3" 
                         [value]="e.consigne" (input)="updateEtapeConsigne(idx, $event)" 
                         placeholder="e.g.: Breathe deeply..." />
                </div>
                <div class="col-md-4">
                  <div class="d-flex align-items-center gap-2">
                    <div class="flex-grow-1">
                      <label class="form-label fw-bold text-muted small text-uppercase mb-0" style="font-size: 10px;">Duration (sec)</label>
                      <input type="number" class="form-control border-0 bg-light p-2 shadow-sm rounded-3 fw-bold text-center" 
                             [value]="e.dureeSecondes" (input)="updateEtapeDuree(idx, $event)" min="1" />
                    </div>
                    <button type="button" class="btn btn-soft-danger rounded-circle p-2 mt-3" (click)="removeEtape(idx)">
                      <i class="fa-solid fa-trash-can small"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div *ngIf="exerciceData.etapes.length === 0" class="text-center py-5 border-2 border-dashed rounded-4 bg-light text-muted">
           <i class="fa-solid fa-person-arrow-up-from-line fs-2 opacity-25 mb-2 d-block"></i>
           Add a step to configure the exercise.
        </div>
      </ng-container>

    </div>
  `,
  styles: [`
    .cursor-pointer { cursor: pointer; }
    .dynamic-form { background: transparent; padding: 0; }
    .transition-all { transition: all 0.2s ease; }
    .btn-white { background: #fff; border: 1px solid #eee; }
    .bg-soft-primary { background-color: rgba(128, 0, 128, 0.08) !important; }
    .bg-soft-success { background-color: rgba(25, 135, 84, 0.08) !important; }
    .bg-soft-warning { background-color: rgba(255, 193, 7, 0.08) !important; }
    .bg-soft-danger { background-color: rgba(220, 53, 69, 0.08) !important; }
    .bg-soft-light { background-color: #f8f9fa !important; }
    .border-dashed { border-style: dashed !important; }
    .fs-12 { font-size: 12px; }
    .form-select {
      height: auto !important;
      line-height: 1.6 !important;
      padding-top: 0.8rem !important;
      padding-bottom: 0.8rem !important;
    }
    .form-control, .form-select {
      box-shadow: 0 2px 5px rgba(0,0,0,0.05) !important;
    }
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
  contentData: ContentData = { contentType: 'video', videoUrl: '', description: '' };
  exerciceData: ExerciceData = { sousType: 'physique', repetitions: 1, etapes: [] };
  private internalUpdate = false;

  constructor() { }

  trackByIndex(index: number, item: any): any {
    return index;
  }

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
      } else if (this.activityType === 'CONTENT') {
        this.contentData = {
          contentType: parsed.contentType || 'video',
          videoUrl: parsed.videoUrl || '',
          description: parsed.description || ''
        };
      } else if (this.activityType === 'EXERCICE') {
        this.exerciceData = {
          sousType: parsed.sousType || 'Physique',
          repetitions: parsed.repetitions || 1,
          etapes: parsed.etapes || []
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

  updateContentSource(event: any): void {
    this.contentData.videoUrl = event.target.value;
    this.emitChange();
  }

  // EXERCICE Methods
  updateExerciceSousType(event: any): void {
    this.exerciceData.sousType = event.target.value;
    this.emitChange();
  }

  updateExerciceRepetitions(event: any): void {
    this.exerciceData.repetitions = parseInt(event.target.value, 10) || 1;
    this.emitChange();
  }

  addEtape(): void {
    const nextNum = this.exerciceData.etapes.length + 1;
    this.exerciceData.etapes.push({ num: nextNum, consigne: '', dureeSecondes: 10 });
    this.emitChange();
  }

  removeEtape(idx: number): void {
    this.exerciceData.etapes.splice(idx, 1);
    // Re-index steps
    this.exerciceData.etapes.forEach((e, i) => e.num = i + 1);
    this.emitChange();
  }

  updateEtapeConsigne(idx: number, event: any): void {
    this.exerciceData.etapes[idx].consigne = event.target.value;
    this.emitChange();
  }

  updateEtapeDuree(idx: number, event: any): void {
    this.exerciceData.etapes[idx].dureeSecondes = parseInt(event.target.value, 10) || 10;
    this.emitChange();
  }

  emitChange(): void {
    this.internalUpdate = true;
    let data: any;
    if (this.activityType === 'QUIZ') data = this.quizData;
    else if (this.activityType === 'GAME') data = this.gameData;
    else if (this.activityType === 'CONTENT') data = this.contentData;
    else if (this.activityType === 'EXERCICE') data = this.exerciceData;
    
    this.dataChange.emit(JSON.stringify(data));
    setTimeout(() => this.internalUpdate = false);
  }
}