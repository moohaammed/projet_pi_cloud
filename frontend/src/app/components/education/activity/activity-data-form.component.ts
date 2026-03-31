import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
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
        <div class="section-header">
          <span class="badge-type quiz">QUIZ</span>
          <span class="section-title">Questions du quiz</span>
          <button type="button" class="btn-add" (click)="addQuestion()">+ Ajouter une question</button>
        </div>

        <div class="question-card" *ngFor="let q of quizData.questions; let i = index; trackBy: trackByIndex">
          <div class="card-top">
            <span class="q-number">Q{{ i + 1 }}</span>
            <button type="button" class="btn-remove" (click)="removeQuestion(i)">✕</button>
          </div>

          <div class="field-group">
            <label>Texte de la question</label>
            <input
              type="text"
              class="field-input"
              [value]="q.texte"
              (input)="updateQuestionText(i, $event)"
              placeholder="Ex: Quelle saison voit fleurir les roses ?" />
          </div>

          <div class="field-group">
            <label>Options de réponse</label>
            <div class="options-list">
              <div class="option-row" *ngFor="let opt of q.options; let j = index; trackBy: trackByIndex">
                <span
                  class="option-letter"
                  [class.correct]="q.reponse_correcte === j"
                  (click)="setCorrectAnswer(i, j)">
                  {{ optionLetters[j] }}
                </span>
                <input
                  type="text"
                  class="field-input"
                  [value]="opt"
                  (input)="updateOption(i, j, $event)"
                  [placeholder]="'Option ' + optionLetters[j]" />
                <button type="button" class="btn-remove-sm" (click)="removeOption(i, j)" *ngIf="q.options.length > 2">✕</button>
              </div>
              <button type="button" class="btn-add-option" (click)="addOption(i)" *ngIf="q.options.length < 5">+ Option</button>
            </div>
            <p class="hint">Cliquez sur la lettre pour marquer la bonne réponse</p>
          </div>

          <div class="field-group">
            <label>Explication (affiché après réponse)</label>
            <input
              type="text"
              class="field-input"
              [value]="q.explication"
              (input)="updateExplication(i, $event)"
              placeholder="Ex: Au printemps, la nature se réveille." />
          </div>
        </div>

        <div class="empty-state" *ngIf="quizData.questions.length === 0">
          <p>Aucune question ajoutée. Cliquez sur "Ajouter une question".</p>
        </div>
      </ng-container>

      <!-- ══════════════════ GAME ══════════════════ -->
      <ng-container *ngIf="activityType === 'GAME'">
        <div class="section-header">
          <span class="badge-type game">GAME</span>
          <span class="section-title">Jeu de mémoire</span>
        </div>

        <div class="row-fields">
          <div class="field-group">
            <label>Thème</label>
            <select class="field-select" [value]="gameData.theme" (change)="updateGameTheme($event)">
              <option value="animaux">🐱 Animaux</option>
              <option value="fleurs">🌸 Fleurs</option>
              <option value="fruits">🍎 Fruits</option>
              <option value="transport">🚗 Transport</option>
            </select>
          </div>

          <div class="field-group">
            <label>Nombre de cartes</label>
            <select class="field-select" [value]="gameData.nombreCartes" (change)="updateGameCartes($event)">
              <option value="6">6 cartes (3 paires)</option>
              <option value="8">8 cartes (4 paires)</option>
              <option value="10">10 cartes (5 paires)</option>
              <option value="12">12 cartes (6 paires)</option>
            </select>
          </div>

          <div class="field-group">
            <label>Timer (secondes)</label>
            <input
              type="number"
              class="field-input"
              [value]="gameData.timer"
              (input)="updateGameTimer($event)"
              min="10"
              max="300" />
          </div>
        </div>

        <div class="game-preview">
          <p class="preview-title">Aperçu du jeu :</p>
          <p>Thème : <strong>{{ getThemeLabel(gameData.theme) }}</strong></p>
          <p>Nombre de paires : <strong>{{ gameData.nombreCartes / 2 }}</strong></p>
          <p>Temps limite : <strong>{{ gameData.timer }}s</strong></p>
        </div>
      </ng-container>

      <!-- ══════════════════ CONTENT ══════════════════ -->
      <ng-container *ngIf="activityType === 'CONTENT'">
        <div class="section-header">
          <span class="badge-type content">CONTENT</span>
          <span class="section-title">Contenu multimédia</span>
        </div>

        <div class="row-fields">
          <div class="field-group">
            <label>Type de contenu</label>
            <select class="field-select" [value]="contentData.contentType" (change)="updateContentType($event)">
              <option value="video">Vidéo</option>
              <option value="article">Article</option>
            </select>
          </div>
          <div class="field-group">
            <label>Langue</label>
            <select class="field-select" [value]="contentData.langue" (change)="updateContentLangue($event)">
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </div>
        </div>

        <div class="field-group" *ngIf="contentData.contentType === 'video'">
          <label>URL de la vidéo</label>
          <input
            type="text"
            class="field-input"
            [value]="contentData.videoUrl || ''"
            (input)="updateContentVideoUrl($event)"
            placeholder="https://youtube.com/watch?v=..." />
        </div>

        <div class="field-group" *ngIf="contentData.contentType === 'article'">
          <label>Image de l'article</label>
          <input
            type="file"
            class="field-input"
            accept="image/*"
            (change)="updateContentImage($event)" />
          <p class="hint" *ngIf="imageFileName">✓ {{ imageFileName }}</p>
        </div>

        <div class="field-group">
          <label>Description</label>
          <textarea
            class="field-input"
            [value]="contentData.description"
            (input)="updateContentDescription($event)"
            placeholder="Ex: Description du contenu..."></textarea>
        </div>

      </ng-container>

      <!-- ══════════════════ EXERCICE ══════════════════ -->
      <ng-container *ngIf="activityType === 'EXERCICE'">
        <div class="section-header">
          <span class="badge-type exercice">EXERCICE</span>
          <span class="section-title">Exercice guidé</span>
        </div>

        <div class="row-fields">
          <div class="field-group">
            <label>Sous-type d'exercice</label>
            <select class="field-select" [value]="exerciceData.sousType" (change)="updateExerciceSousType($event)">
              <option value="respiration">Respiration</option>
              <option value="meditation">Méditation</option>
              <option value="etirement">Étirement</option>
              <option value="memoire">Mémoire</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div class="field-group">
            <label>Nombre de répétitions</label>
            <input
              type="number"
              class="field-input"
              [value]="exerciceData.repetitions"
              (input)="updateExerciceRepetitions($event)"
              min="1"
              max="20" />
          </div>
        </div>

        <div class="section-subheader">
          <span>Étapes</span>
          <button type="button" class="btn-add" (click)="addEtape()">+ Ajouter une étape</button>
        </div>

        <div class="etape-row" *ngFor="let e of exerciceData.etapes; let i = index; trackBy: trackByIndex">
          <div class="etape-num">{{ e.num }}</div>
          <input
            type="text"
            class="field-input flex-grow"
            [value]="e.consigne"
            (input)="updateEtapeConsigne(i, $event)"
            placeholder="Ex: Inspirez lentement..." />
          <div class="etape-timer">
            <input
              type="number"
              class="field-input timer-input"
              [value]="e.dureeSecondes"
              (input)="updateEtapeDuree(i, $event)"
              min="1"
              max="120" />
            <span class="timer-label">sec</span>
          </div>
          <button type="button" class="btn-remove-sm" (click)="removeEtape(i)" *ngIf="exerciceData.etapes.length > 1">✕</button>
        </div>
      </ng-container>

      <!-- ══════════════════ Aperçu JSON ══════════════════ -->
      <div class="json-preview" *ngIf="activityType">
        <button type="button" class="json-toggle" (click)="showJson = !showJson">
          {{ showJson ? '▼' : '▶' }} Aperçu JSON généré
        </button>
        <pre class="json-content" *ngIf="showJson">{{ currentJson }}</pre>
      </div>

    </div>
  `,
  styles: [`
    .dynamic-form { font-family: 'Segoe UI', sans-serif; }

    .section-header {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 16px; flex-wrap: wrap;
    }
    .section-title { font-weight: 600; font-size: 15px; flex: 1; }
    .section-subheader {
      display: flex; align-items: center; justify-content: space-between;
      margin: 16px 0 8px; font-weight: 600; font-size: 14px;
    }

    .badge-type {
      padding: 3px 10px; border-radius: 20px; font-size: 11px;
      font-weight: 700; letter-spacing: .5px;
    }
    .badge-type.quiz    { background:#d1fae5; color:#065f46; }
    .badge-type.game    { background:#dbeafe; color:#1e40af; }
    .badge-type.content { background:#fef3c7; color:#92400e; }
    .badge-type.exercice{ background:#fee2e2; color:#991b1b; }

    .btn-add {
      background: #2563eb; color: #fff; border: none;
      padding: 6px 14px; border-radius: 6px; cursor: pointer;
      font-size: 13px; font-weight: 600; transition: background .2s;
    }
    .btn-add:hover { background: #1d4ed8; }

    .btn-add-option {
      background: none; color: #2563eb; border: 1px dashed #2563eb;
      padding: 4px 12px; border-radius: 6px; cursor: pointer;
      font-size: 12px; margin-top: 4px;
    }

    .btn-remove {
      background: none; border: none; color: #ef4444;
      cursor: pointer; font-size: 16px; padding: 2px 6px;
    }
    .btn-remove-sm {
      background: none; border: none; color: #ef4444;
      cursor: pointer; font-size: 13px; padding: 2px 6px; flex-shrink: 0;
    }

    .field-group { margin-bottom: 12px; }
    .field-group label {
      display: block; font-size: 13px; font-weight: 600;
      color: #374151; margin-bottom: 4px;
    }

    .field-input {
      width: 100%; padding: 8px 12px; border: 1px solid #d1d5db;
      border-radius: 6px; font-size: 14px; outline: none;
      box-sizing: border-box; transition: border-color .2s;
    }
    .field-input:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37,99,235,.1);
    }

    .field-select {
      width: 100%; padding: 8px 12px; border: 1px solid #d1d5db;
      border-radius: 6px; font-size: 14px; background: white;
      outline: none; box-sizing: border-box;
    }

    .row-fields { display: flex; gap: 16px; flex-wrap: wrap; }
    .row-fields .field-group { flex: 1; min-width: 200px; }

    .question-card {
      border: 1px solid #e5e7eb; border-radius: 10px;
      padding: 16px; margin-bottom: 14px; background: #f9fafb;
    }
    .card-top {
      display: flex; justify-content: space-between;
      align-items: center; margin-bottom: 12px;
    }
    .q-number { font-weight: 700; font-size: 13px; color: #6b7280; }

    .options-list { display: flex; flex-direction: column; gap: 8px; }
    .option-row { display: flex; align-items: center; gap: 8px; }
    .option-letter {
      width: 28px; height: 28px; border-radius: 50%;
      background: #e5e7eb; display: flex; align-items: center;
      justify-content: center; font-weight: 700; font-size: 12px;
      cursor: pointer; flex-shrink: 0; transition: all .2s;
    }
    .option-letter.correct { background: #22c55e; color: white; }
    .hint { font-size: 11px; color: #9ca3af; margin-top: 4px; }

    .game-preview {
      background: #f9fafb; border: 1px solid #e5e7eb;
      border-radius: 8px; padding: 16px; margin-top: 16px;
    }
    .preview-title { font-weight: 600; font-size: 14px; margin-bottom: 8px; color: #374151; }
    .game-preview p { margin: 4px 0; font-size: 14px; color: #6b7280; }

    .etape-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .etape-num {
      width: 28px; height: 28px; border-radius: 50%;
      background: #2563eb; color: white; display: flex;
      align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700; flex-shrink: 0;
    }
    .flex-grow { flex: 1; }
    .etape-timer { display: flex; align-items: center; gap: 4px; }
    .timer-input { width: 70px; }
    .timer-label { font-size: 12px; color: #6b7280; }

    .checkbox-group { display: flex; align-items: center; }
    .checkbox-label {
      display: flex; align-items: center; gap: 8px;
      cursor: pointer; font-size: 14px; font-weight: normal !important;
    }
    .checkbox-label input { width: 16px; height: 16px; cursor: pointer; }

    .empty-state { text-align: center; color: #9ca3af; padding: 24px; font-size: 14px; }

    .json-preview { margin-top: 20px; border-top: 1px dashed #e5e7eb; padding-top: 12px; }
    .json-toggle {
      background: none; border: none; color: #6b7280;
      font-size: 12px; cursor: pointer; font-weight: 600;
    }
    .json-content {
      background: #1e293b; color: #a3e635; padding: 12px;
      border-radius: 8px; font-size: 12px; overflow-x: auto;
      margin-top: 8px; max-height: 200px; overflow-y: auto;
    }
  `]
})
export class ActivityDataFormComponent implements OnChanges {
  @Input() activityType: string = '';
  @Input() initialData: any = '{}';
  @Output() dataChange = new EventEmitter<string>();

  optionLetters = ['A', 'B', 'C', 'D', 'E'];
  showJson = false;
  currentJson = '{}';

  private internalUpdate = false;

  quizData: QuizData = { questions: [] };

  gameData: GameData = {
    theme: 'animaux',
    nombreCartes: 8,
    timer: 60
  };

  contentData: ContentData = {
    contentType: 'video',
    videoUrl: '',
    langue: 'fr',
    description: ''
  };

  imageFileName: string = '';

  exerciceData: ExerciceData = {
    sousType: 'respiration',
    repetitions: 3,
    etapes: [{ num: 1, consigne: '', dureeSecondes: 4 }]
  };

  private readonly THEME_PAIRS: Record<string, { id: number; emoji: string; nom: string }[]> = {
    animaux: [
      { id: 1, emoji: '🐱', nom: 'Chat' },
      { id: 2, emoji: '🐶', nom: 'Chien' },
      { id: 3, emoji: '🐸', nom: 'Grenouille' },
      { id: 4, emoji: '🦊', nom: 'Renard' },
      { id: 5, emoji: '🐼', nom: 'Panda' },
      { id: 6, emoji: '🐧', nom: 'Pingouin' },
    ],
    fleurs: [
      { id: 1, emoji: '🌸', nom: 'Cerisier' },
      { id: 2, emoji: '🌻', nom: 'Tournesol' },
      { id: 3, emoji: '🌹', nom: 'Rose' },
      { id: 4, emoji: '🌷', nom: 'Tulipe' },
      { id: 5, emoji: '🌼', nom: 'Marguerite' },
      { id: 6, emoji: '💐', nom: 'Bouquet' },
    ],
    fruits: [
      { id: 1, emoji: '🍎', nom: 'Pomme' },
      { id: 2, emoji: '🍌', nom: 'Banane' },
      { id: 3, emoji: '🍇', nom: 'Raisin' },
      { id: 4, emoji: '🍓', nom: 'Fraise' },
      { id: 5, emoji: '🍊', nom: 'Orange' },
      { id: 6, emoji: '🍑', nom: 'Pêche' },
    ],
    transport: [
      { id: 1, emoji: '🚗', nom: 'Voiture' },
      { id: 2, emoji: '✈️', nom: 'Avion' },
      { id: 3, emoji: '🚢', nom: 'Bateau' },
      { id: 4, emoji: '🚂', nom: 'Train' },
      { id: 5, emoji: '🚲', nom: 'Vélo' },
      { id: 6, emoji: '🚁', nom: 'Hélicoptère' },
    ]
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activityType']) {
      this.resetDataForType();
      this.loadInitialData();
      this.emitChange(false);
      return;
    }

    if (changes['initialData']) {
      if (this.internalUpdate) {
        this.internalUpdate = false;
        return;
      }

      const incoming = this.safeStringify(this.safeParse(this.initialData));
      if (incoming && incoming !== '{}' && incoming !== this.currentJson) {
        this.loadInitialData();
      }
    }
  }

  private resetDataForType(): void {
    switch (this.activityType) {
      case 'QUIZ':
        this.quizData = { questions: [] };
        break;
      case 'GAME':
        this.gameData = {
          theme: 'animaux',
          nombreCartes: 8,
          timer: 60
        };
        break;
      case 'CONTENT':
        this.contentData = {
          contentType: 'video',
          videoUrl: '',
          langue: 'fr',
          description: ''
        };
        break;
      case 'EXERCICE':
        this.exerciceData = {
          sousType: 'respiration',
          repetitions: 3,
          etapes: [{ num: 1, consigne: '', dureeSecondes: 4 }]
        };
        break;
    }
  }

  private safeParse(value: any): any {
    try {
      return typeof value === 'string' ? JSON.parse(value || '{}') : (value || {});
    } catch {
      return {};
    }
  }

  private safeStringify(value: any): string {
    try {
      return JSON.stringify(value ?? {}, null, 2);
    } catch {
      return '{}';
    }
  }

  private loadInitialData(): void {
    const parsed = this.safeParse(this.initialData);
    if (!parsed || Object.keys(parsed).length === 0) return;

    switch (this.activityType) {
      case 'QUIZ':
        if (parsed.questions) {
          this.quizData = {
            questions: parsed.questions.map((q: any) => ({
              texte: q.texte ?? '',
              options: Array.isArray(q.options) ? [...q.options] : ['', ''],
              reponse_correcte: q.reponse_correcte ?? 0,
              explication: q.explication ?? ''
            }))
          };
        }
        break;

      case 'GAME':
        this.gameData = {
          theme: parsed.theme ?? 'animaux',
          nombreCartes: parsed.nombreCartes ?? 8,
          timer: parsed.timer ?? 60
        };
        break;

      case 'CONTENT':
        this.contentData = {
          contentType: parsed.contentType ?? 'video',
          videoUrl: parsed.videoUrl ?? '',
          imageUrl: parsed.imageUrl ?? '',
          langue: parsed.langue ?? 'fr',
          description: parsed.description ?? ''
        };
        this.imageFileName = '';
        break;

      case 'EXERCICE':
        this.exerciceData = {
          sousType: parsed.sousType ?? 'respiration',
          repetitions: parsed.repetitions ?? 3,
          etapes: Array.isArray(parsed.etapes) && parsed.etapes.length
            ? parsed.etapes.map((e: any, idx: number) => ({
                num: e.num ?? idx + 1,
                consigne: e.consigne ?? '',
                dureeSecondes: e.dureeSecondes ?? 4
              }))
            : [{ num: 1, consigne: '', dureeSecondes: 4 }]
        };
        break;
    }

    this.currentJson = this.safeStringify(this.getCurrentData());
  }

  emitChange(markAsInternal: boolean = true): void {
    let data: any = {};

    switch (this.activityType) {
      case 'QUIZ':
        data = this.quizData;
        break;

      case 'GAME': {
        const allPairs = this.THEME_PAIRS[this.gameData.theme] || [];
        const pairesCount = Math.floor(this.gameData.nombreCartes / 2);
        data = {
          ...this.gameData,
          paires: allPairs.slice(0, pairesCount)
        };
        break;
      }

      case 'CONTENT':
        data = this.contentData;
        break;

      case 'EXERCICE':
        data = this.exerciceData;
        break;

      default:
        data = {};
    }

    this.currentJson = JSON.stringify(data, null, 2);

    if (markAsInternal) {
      this.internalUpdate = true;
    }

    this.dataChange.emit(this.currentJson);
  }

  trackByIndex(index: number): number {
    return index;
  }

  private getCurrentData(): any {
    switch (this.activityType) {
      case 'QUIZ':
        return this.quizData;
      case 'GAME':
        return this.gameData;
      case 'CONTENT':
        return this.contentData;
      case 'EXERCICE':
        return this.exerciceData;
      default:
        return {};
    }
  }

  getThemeLabel(theme: string): string {
    const labels: any = {
      'animaux': '🐱 Animaux',
      'fleurs': '🌸 Fleurs',
      'fruits': '🍎 Fruits',
      'transport': '🚗 Transport'
    };
    return labels[theme] || theme;
  }

  addQuestion(): void {
    this.quizData.questions.push({
      texte: '',
      options: ['', ''],
      reponse_correcte: 0,
      explication: ''
    });
    this.emitChange();
  }

  removeQuestion(i: number): void {
    this.quizData.questions.splice(i, 1);
    this.emitChange();
  }

  updateQuestionText(i: number, event: Event): void {
    this.quizData.questions[i].texte = (event.target as HTMLInputElement).value;
    this.emitChange();
  }

  updateOption(qIndex: number, oIndex: number, event: Event): void {
    this.quizData.questions[qIndex].options[oIndex] = (event.target as HTMLInputElement).value;
    this.emitChange();
  }

  updateExplication(i: number, event: Event): void {
    this.quizData.questions[i].explication = (event.target as HTMLInputElement).value;
    this.emitChange();
  }

  setCorrectAnswer(qIndex: number, oIndex: number): void {
    this.quizData.questions[qIndex].reponse_correcte = oIndex;
    this.emitChange();
  }

  addOption(qIndex: number): void {
    this.quizData.questions[qIndex].options.push('');
    this.emitChange();
  }

  removeOption(qIndex: number, oIndex: number): void {
    const q = this.quizData.questions[qIndex];
    q.options.splice(oIndex, 1);

    if (q.reponse_correcte >= q.options.length) {
      q.reponse_correcte = 0;
    }

    this.emitChange();
  }

  updateGameTheme(event: Event): void {
    this.gameData.theme = (event.target as HTMLSelectElement).value as 'animaux' | 'fleurs' | 'fruits' | 'transport';
    this.emitChange();
  }

  updateGameCartes(event: Event): void {
    this.gameData.nombreCartes = parseInt((event.target as HTMLSelectElement).value, 10) as 6 | 8 | 10 | 12;
    this.emitChange();
  }

  updateGameTimer(event: Event): void {
    this.gameData.timer = parseInt((event.target as HTMLInputElement).value, 10) || 0;
    this.emitChange();
  }

  updateContentType(event: Event): void {
    this.contentData.contentType = (event.target as HTMLSelectElement).value as 'video' | 'article';
    this.imageFileName = '';
    this.emitChange();
  }

  updateContentLangue(event: Event): void {
    this.contentData.langue = (event.target as HTMLSelectElement).value;
    this.emitChange();
  }

  updateContentVideoUrl(event: Event): void {
    this.contentData.videoUrl = (event.target as HTMLInputElement).value;
    this.emitChange();
  }

  updateContentImage(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.imageFileName = file.name;
      // Convertir le fichier en base64 pour le stockage
      const reader = new FileReader();
      reader.onload = (e) => {
        this.contentData.imageUrl = e.target?.result as string;
        this.emitChange();
      };
      reader.readAsDataURL(file);
    }
  }

  updateContentDescription(event: Event): void {
    this.contentData.description = (event.target as HTMLTextAreaElement).value;
    this.emitChange();
  }



  updateExerciceSousType(event: Event): void {
    this.exerciceData.sousType = (event.target as HTMLSelectElement).value;
    this.emitChange();
  }

  updateExerciceRepetitions(event: Event): void {
    this.exerciceData.repetitions = parseInt((event.target as HTMLInputElement).value, 10) || 1;
    this.emitChange();
  }

  addEtape(): void {
    this.exerciceData.etapes.push({
      num: this.exerciceData.etapes.length + 1,
      consigne: '',
      dureeSecondes: 4
    });
    this.emitChange();
  }

  removeEtape(i: number): void {
    this.exerciceData.etapes.splice(i, 1);
    this.exerciceData.etapes.forEach((e, idx) => e.num = idx + 1);
    this.emitChange();
  }

  updateEtapeConsigne(i: number, event: Event): void {
    this.exerciceData.etapes[i].consigne = (event.target as HTMLInputElement).value;
    this.emitChange();
  }

  updateEtapeDuree(i: number, event: Event): void {
    this.exerciceData.etapes[i].dureeSecondes = parseInt((event.target as HTMLInputElement).value, 10) || 0;
    this.emitChange();
  }
}