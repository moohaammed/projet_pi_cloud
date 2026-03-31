import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivityService } from '../../../services/education/activity.service';
import { ActivityModel } from '../../../models/education/activity.model';

@Component({
  selector: 'app-activity-player-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="container">

      <!-- Barre supérieure avec bouton Créer activité -->
      <div class="top-bar">
        <button class="btn-create" (click)="goToCreateActivity()">
  Créer activité
</button>
      </div>

      <!-- Indicateur de chargement -->
      <div class="loading" *ngIf="isLoading">
        <div class="spinner"></div>
        <p>Chargement des activités...</p>
      </div>

      <!-- Message d'erreur -->
      <div class="error-message" *ngIf="errorMessage">
        <p>❌ {{ errorMessage }}</p>
        <button class="btn-retry" (click)="loadActivities()">Réessayer</button>
      </div>

      <!-- Menu de sélection -->
      <div class="selection-menu" *ngIf="!selectedType && !playingActivity && !isLoading">
        <h1 class="main-title">Choisissez une activité</h1>
        <div class="type-buttons">
          <button class="type-btn quiz" (click)="selectType('QUIZ')">
            <div class="icon">📝</div>
            <div class="type-name">Quiz</div>
            <div class="type-desc">Testez vos connaissances</div>
          </button>

          <button class="type-btn game" (click)="selectType('GAME')">
            <div class="icon">🎮</div>
            <div class="type-name">Jeux</div>
            <div class="type-desc">Memory et puzzles</div>
          </button>

          <button class="type-btn content" (click)="selectType('CONTENT')">
            <div class="icon">📺</div>
            <div class="type-name">Contenu</div>
            <div class="type-desc">Vidéos et articles</div>
          </button>

          <button class="type-btn exercice" (click)="selectType('EXERCICE')">
            <div class="icon">🧘</div>
            <div class="type-name">Exercices</div>
            <div class="type-desc">Respiration et méditation</div>
          </button>
        </div>
      </div>

      <!-- Liste des activités du type sélectionné -->
      <div class="activities-list" *ngIf="selectedType && !playingActivity">
        <div class="header">
          <button class="btn-back" (click)="backToMenu()">← Retour</button>
          <h2 class="list-title">{{ getTypeLabel(selectedType) }}</h2>
        </div>

        <div class="activities-grid">
          <div class="activity-card"
               *ngFor="let activity of filteredActivities"
               (click)="playActivity(activity)">
            <div class="activity-header">
              <span class="activity-type" [class]="selectedType.toLowerCase()">
                {{ selectedType }}
              </span>
              <span class="activity-stade">{{ activity.stade }}</span>
            </div>
            <h3 class="activity-title">{{ activity.title }}</h3>
            <p class="activity-desc">{{ activity.description }}</p>
            <div class="activity-footer">
              <span class="duration">⏱ {{ activity.estimatedMinutes }} min</span>
              <button class="btn-play">Jouer →</button>
            </div>
          </div>

          <div class="empty-state" *ngIf="filteredActivities.length === 0">
            <p>Aucune activité disponible pour ce type</p>
            <button class="btn-primary" (click)="backToMenu()">Retour au menu</button>
          </div>
        </div>
      </div>

      <!-- Player de l'activité sélectionnée -->
      <div class="activity-player" *ngIf="playingActivity">
        <div class="player-header">
          <button class="btn-back" (click)="stopActivity()">← Quitter</button>
          <h2>{{ playingActivity.title }}</h2>
        </div>

        <!-- QUIZ Player -->
        <div class="quiz-player" *ngIf="playingActivity.type === 'QUIZ'">
          <div class="quiz-progress">
            Question {{ currentQuestionIndex + 1 }} / {{ quizQuestions.length }}
          </div>

          <div class="question-card" *ngIf="currentQuestion">
            <h3 class="question-text">{{ currentQuestion.texte }}</h3>

            <div class="options-list">
              <button class="option-btn"
                      *ngFor="let opt of currentQuestion.options; let i = index"
                      [class.correct]="answered && i === currentQuestion.reponse_correcte"
                      [class.wrong]="answered && i === selectedAnswer && i !== currentQuestion.reponse_correcte"
                      [disabled]="answered"
                      (click)="selectAnswer(i)">
                {{ opt }}
              </button>
            </div>

            <div class="explanation" *ngIf="answered && currentQuestion.explication">
              <strong>💡 Explication :</strong> {{ currentQuestion.explication }}
            </div>

            <button class="btn-next"
                    *ngIf="answered"
                    (click)="nextQuestion()">
              {{ isLastQuestion() ? 'Voir le résultat' : 'Question suivante' }}
            </button>
          </div>

          <div class="quiz-result" *ngIf="quizFinished">
            <h2>Quiz terminé !</h2>
            <div class="score">{{ quizScore }} / {{ quizQuestions.length }}</div>
            <p class="score-message">{{ getScoreMessage() }}</p>
            <button class="btn-primary" (click)="restartQuiz()">Recommencer</button>
            <button class="btn-secondary" (click)="stopActivity()">Choisir une autre activité</button>
          </div>
        </div>

        <!-- GAME Player (Memory) -->
        <div class="game-player" *ngIf="playingActivity.type === 'GAME'">
          <div class="game-info">
            <div class="timer">⏱ {{ gameTimer }}s</div>
            <div class="moves">Coups : {{ gameMoves }}</div>
          </div>

          <div class="memory-grid">
            <div class="memory-card"
                 *ngFor="let card of memoryCards; let i = index"
                 [class.flipped]="card.flipped"
                 [class.matched]="card.matched"
                 (click)="flipCard(i)">
              <div class="card-front">?</div>
              <div class="card-back">{{ card.emoji }}</div>
            </div>
          </div>

          <div class="game-result" *ngIf="gameFinished">
            <h2>🎉 Gagné !</h2>
            <p>Coups : {{ gameMoves }}</p>
            <button class="btn-primary" (click)="restartGame()">Rejouer</button>
            <button class="btn-secondary" (click)="stopActivity()">Choisir une autre activité</button>
          </div>
        </div>

        <!-- CONTENT Player -->
        <div class="content-player" *ngIf="playingActivity.type === 'CONTENT'">
          <div class="content-card">
            <!-- Vidéo YouTube embedded -->
            <div class="video-container" *ngIf="contentData.contentType === 'video' && safeVideoUrl">
              <iframe
                class="video-iframe"
                [src]="safeVideoUrl"
                title="Lecteur vidéo"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen>
              </iframe>
            </div>

            <!-- Placeholder si pas de vidéo -->
            <div class="video-placeholder" *ngIf="contentData.contentType === 'video' && !safeVideoUrl">
              <p>❌ URL vidéo invalide</p>
              <p class="video-url">{{ contentData.videoUrl }}</p>
            </div>

            <!-- Image de l'article -->
            <div class="article-image-container" *ngIf="contentData.contentType === 'article' && contentData.imageUrl">
              <img [src]="contentData.imageUrl" alt="Image de l'article" class="article-image" />
            </div>

            <!-- Placeholder si pas d'image -->
            <div class="image-placeholder" *ngIf="contentData.contentType === 'article' && !contentData.imageUrl">
              <p>📄 Aucune image fournie</p>
            </div>

            <div class="content-info">
              <p><strong>Type :</strong> {{ contentData.contentType }}</p>
              <p><strong>Langue :</strong> {{ contentData.langue }}</p>
              <p *ngIf="contentData.description"><strong>Description :</strong> {{ contentData.description }}</p>
            </div>
            <button class="btn-primary" (click)="stopActivity()">Terminer</button>
          </div>
        </div>

        <!-- EXERCICE Player -->
        <div class="exercice-player" *ngIf="playingActivity.type === 'EXERCICE'">
          <div class="exercice-info">
            <h3>{{ exerciceData.sousType }}</h3>
            <p>Répétition {{ exerciceCurrentRep }} / {{ exerciceData.repetitions }}</p>
          </div>

          <div class="etape-card" *ngIf="currentEtape">
            <div class="etape-number">{{ currentEtape.num }}</div>
            <h3 class="etape-consigne">{{ currentEtape.consigne }}</h3>
            <div class="countdown">{{ exerciceCountdown }}s</div>
            <div class="progress-bar">
              <div class="progress" [style.width.%]="getEtapeProgress()"></div>
            </div>
          </div>

          <div class="exercice-result" *ngIf="exerciceFinished">
            <h2>✅ Exercice terminé !</h2>
            <button class="btn-primary" (click)="stopActivity()">Choisir une autre activité</button>
          </div>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    /* ═══ Top Bar ═══ */
    .top-bar {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 16px;
    }

   .btn-create {
  background: #2d3748;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 15px;
  transition: background 0.2s, transform 0.2s;
}

.btn-create:hover {
  background: #1a202c;
  transform: translateY(-2px);
}

    /* ═══ Loading & Error ═══ */
    .loading { text-align: center; padding: 60px 20px; }

    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3b82f6;
      border-radius: 50%;
      width: 50px; height: 50px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-message {
      text-align: center; padding: 40px;
      background: #fee2e2; border-radius: 12px; color: #991b1b;
    }

    .btn-retry {
      background: #ef4444; color: white; border: none;
      padding: 10px 24px; border-radius: 8px; cursor: pointer;
      font-weight: 600; margin-top: 16px;
    }

    /* ═══ Menu de sélection ═══ */
    .selection-menu { text-align: center; padding: 40px 20px; }

    .main-title {
      font-size: 32px; font-weight: 700;
      margin-bottom: 40px; color: #1e293b;
      margin-top: -60px; color: #1e293b;
    }

    /* ✅ Grille 2 colonnes fixes */
    .type-buttons {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
      max-width: 600px;
      margin: 0 auto;
    }

    .type-btn {
      background: white; border: 3px solid transparent;
      border-radius: 16px; padding: 32px 24px; cursor: pointer;
      transition: all 0.3s; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .type-btn:hover { transform: translateY(-4px); box-shadow: 0 8px 20px rgba(0,0,0,0.15); }
    .type-btn.quiz:hover     { border-color: #10b981; }
    .type-btn.game:hover     { border-color: #3b82f6; }
    .type-btn.content:hover  { border-color: #f59e0b; }
    .type-btn.exercice:hover { border-color: #ef4444; }

    .type-btn .icon { font-size: 48px; margin-bottom: 12px; }
    .type-btn .type-name { font-size: 24px; font-weight: 700; margin-bottom: 8px; color: #1e293b; }
    .type-btn .type-desc { font-size: 14px; color: #64748b; }

    /* ═══ Liste des activités ═══ */
    .header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }

    .btn-back {
      background: #f1f5f9; border: none; padding: 10px 16px;
      border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600;
    }
    .btn-back:hover { background: #e2e8f0; }

    .list-title { font-size: 28px; font-weight: 700; color: #1e293b; }

    .activities-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }

    .activity-card {
      background: white; border-radius: 12px; padding: 20px;
      cursor: pointer; transition: all 0.3s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .activity-card:hover { transform: translateY(-4px); box-shadow: 0 6px 16px rgba(0,0,0,0.15); }

    .activity-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }

    .activity-type {
      padding: 4px 12px; border-radius: 20px;
      font-size: 11px; font-weight: 700; text-transform: uppercase;
    }
    .activity-type.quiz     { background: #d1fae5; color: #065f46; }
    .activity-type.game     { background: #dbeafe; color: #1e40af; }
    .activity-type.content  { background: #fef3c7; color: #92400e; }
    .activity-type.exercice { background: #fee2e2; color: #991b1b; }

    .activity-stade { font-size: 12px; color: #64748b; font-weight: 600; }
    .activity-title { font-size: 20px; font-weight: 700; margin-bottom: 8px; color: #1e293b; }
    .activity-desc  { font-size: 14px; color: #64748b; margin-bottom: 16px; line-height: 1.5; }

    .activity-footer { display: flex; justify-content: space-between; align-items: center; }
    .duration { font-size: 13px; color: #64748b; }

    .btn-play {
      background: #2563eb; color: white; border: none;
      padding: 8px 16px; border-radius: 6px; cursor: pointer;
      font-weight: 600; font-size: 14px;
    }

    /* ═══ Player header ═══ */
    .player-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .player-header h2 { font-size: 24px; font-weight: 700; color: #1e293b; }

    /* ═══ Quiz Player ═══ */
    .quiz-progress {
      text-align: center; font-size: 16px; font-weight: 600;
      margin-bottom: 20px; color: #64748b;
    }

    .question-card {
      background: white; border-radius: 12px; padding: 32px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .question-text { font-size: 24px; font-weight: 700; margin-bottom: 24px; color: #1e293b; }

    .options-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }

    .option-btn {
      background: #f1f5f9; border: 2px solid #e2e8f0;
      padding: 16px 20px; border-radius: 10px; cursor: pointer;
      font-size: 16px; text-align: left; transition: all 0.2s;
    }
    .option-btn:hover:not(:disabled) { background: #e2e8f0; border-color: #cbd5e1; }
    .option-btn.correct { background: #d1fae5; border-color: #10b981; color: #065f46; }
    .option-btn.wrong   { background: #fee2e2; border-color: #ef4444; color: #991b1b; }

    .explanation {
      background: #eff6ff; border-left: 4px solid #3b82f6;
      padding: 16px; border-radius: 8px; margin-bottom: 20px; font-size: 14px;
    }

    .btn-next {
      background: #2563eb; color: white; border: none;
      padding: 12px 24px; border-radius: 8px; cursor: pointer;
      font-weight: 600; font-size: 16px; width: 100%;
    }

    .quiz-result {
      text-align: center; background: white;
      border-radius: 12px; padding: 48px;
    }
    .score { font-size: 64px; font-weight: 700; color: #10b981; margin: 20px 0; }
    .score-message { font-size: 20px; color: #64748b; margin-bottom: 32px; }

    /* ═══ Memory Game ═══ */
    .game-info {
      display: flex; justify-content: center; gap: 32px;
      margin-bottom: 24px; font-size: 18px; font-weight: 600;
    }

    .memory-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px; max-width: 600px; margin: 0 auto;
    }

    .memory-card {
      aspect-ratio: 1; background: #3b82f6;
      border-radius: 12px; cursor: pointer;
      position: relative; transition: transform 0.3s;
    }
    .memory-card:hover { transform: scale(1.05); }

    .memory-card.flipped,
    .memory-card.matched {
      background: white; border: 3px solid #3b82f6;
    }
    .memory-card.matched { background: #d1fae5; border-color: #10b981; }

    .card-front,
    .card-back {
      position: absolute; width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      font-size: 48px; font-weight: 700; border-radius: 12px;
    }
    .card-front { color: white; }

    .memory-card:not(.flipped):not(.matched) .card-back { display: none; }
    .memory-card.flipped .card-front,
    .memory-card.matched .card-front { display: none; }

    /* ═══ Content Player ═══ */
    .content-card {
      background: white; border-radius: 12px; padding: 32px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .video-container {
      position: relative; width: 100%; padding-bottom: 56.25%;
      margin-bottom: 20px; height: 0; overflow: hidden; border-radius: 8px;
    }

    .video-iframe {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      border-radius: 8px;
    }

    .video-placeholder {
      background: #f1f5f9; border-radius: 8px;
      padding: 40px; text-align: center; margin-bottom: 20px;
    }
    .video-url { color: #3b82f6; word-break: break-all; }

    .article-image-container {
      margin-bottom: 20px; border-radius: 8px; overflow: hidden;
    }

    .article-image {
      width: 100%; height: auto; display: block; border-radius: 8px;
      max-height: 500px; object-fit: cover;
    }

    .image-placeholder {
      background: #f1f5f9; border-radius: 8px;
      padding: 40px; text-align: center; margin-bottom: 20px; color: #64748b;
    }

    .content-info p { margin: 12px 0; font-size: 16px; }

    /* ═══ Exercice Player ═══ */
    .exercice-info { text-align: center; margin-bottom: 24px; }

    .etape-card {
      background: white; border-radius: 12px; padding: 48px;
      text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .etape-number {
      background: #3b82f6; color: white;
      width: 48px; height: 48px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; margin: 0 auto 16px;
    }

    .etape-consigne { font-size: 24px; margin-bottom: 32px; color: #1e293b; }
    .countdown { font-size: 72px; font-weight: 700; color: #3b82f6; margin-bottom: 24px; }

    .progress-bar {
      background: #e2e8f0; height: 12px;
      border-radius: 6px; overflow: hidden;
    }
    .progress { background: #3b82f6; height: 100%; transition: width 0.3s; }

    /* ═══ Boutons communs ═══ */
    .btn-primary {
      background: #2563eb; color: white; border: none;
      padding: 12px 32px; border-radius: 8px; cursor: pointer;
      font-weight: 600; font-size: 16px; margin: 8px;
    }

    .btn-secondary {
      background: #f1f5f9; color: #1e293b; border: none;
      padding: 12px 32px; border-radius: 8px; cursor: pointer;
      font-weight: 600; font-size: 16px; margin: 8px;
    }

    .empty-state { grid-column: 1 / -1; text-align: center; padding: 48px; color: #64748b; }

    .game-result,
    .exercice-result {
      text-align: center; background: white;
      border-radius: 12px; padding: 48px; margin-top: 24px;
    }
  `]
})
export class EducationComponent implements OnInit {
  selectedType: 'QUIZ' | 'GAME' | 'CONTENT' | 'EXERCICE' | null = null;
  playingActivity: ActivityModel | null = null;

  activities: ActivityModel[] = [];
  filteredActivities: ActivityModel[] = [];
  isLoading = true;
  errorMessage = '';

  // Quiz state
  quizQuestions: any[] = [];
  currentQuestionIndex = 0;
  currentQuestion: any = null;
  answered = false;
  selectedAnswer: number | null = null;
  quizScore = 0;
  quizFinished = false;

  // Game state
  memoryCards: any[] = [];
  gameTimer = 60;
  gameMoves = 0;
  gameFinished = false;
  gameElapsed = 0;
  flippedCards: number[] = [];

  // Content state
  contentData: any = {};
  safeVideoUrl: SafeResourceUrl = '';

  // Exercice state
  exerciceData: any = {};
  currentEtape: any = null;
  exerciceCountdown = 0;
  exerciceCurrentRep = 1;
  exerciceFinished = false;
  exerciceInterval: any;

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

  constructor(
    private activityService: ActivityService,
    private sanitizer: DomSanitizer,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadActivities();
  }

  // ─── Navigation vers la page de création ───────────────────────────────────
  goToCreateActivity(): void {
    this.router.navigate(['/activities']);
  }

  loadActivities(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.activityService.getAll().subscribe({
      next: (data) => {
        this.activities = data.filter(a => a.active);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des activités:', err);
        this.errorMessage = 'Impossible de charger les activités. Veuillez réessayer.';
        this.isLoading = false;
      }
    });
  }

  selectType(type: 'QUIZ' | 'GAME' | 'CONTENT' | 'EXERCICE'): void {
    this.selectedType = type;
    this.filteredActivities = this.activities.filter(a => a.type === type);
  }

  backToMenu(): void {
    this.selectedType = null;
    this.filteredActivities = [];
  }

  playActivity(activity: ActivityModel): void {
    this.playingActivity = activity;

    try {
      let data: any;
      if (typeof activity.data === 'string') {
        try { data = JSON.parse(activity.data || '{}'); }
        catch { data = {}; }
      } else {
        data = activity.data || {};
      }

      switch (activity.type) {
        case 'QUIZ':     this.initQuiz(data);     break;
        case 'GAME':     this.initGame(data);     break;
        case 'CONTENT':  this.initContent(data);  break;
        case 'EXERCICE': this.initExercice(data); break;
      }
    } catch (e) {
      console.error('Erreur lors du parsing des données:', e);
      this.errorMessage = 'Données d\'activité invalides';
      this.playingActivity = null;
    }
  }

  stopActivity(): void {
    this.playingActivity = null;
    this.selectedType = null;
    this.resetAllStates();
  }

  resetAllStates(): void {
    this.quizQuestions = [];
    this.currentQuestionIndex = 0;
    this.answered = false;
    this.quizScore = 0;
    this.quizFinished = false;

    this.memoryCards = [];
    this.gameFinished = false;
    this.gameMoves = 0;

    if (this.exerciceInterval) clearInterval(this.exerciceInterval);
    this.exerciceFinished = false;
  }

  getTypeLabel(type: string): string {
    const labels: any = { 'QUIZ': 'Quiz', 'GAME': 'Jeux', 'CONTENT': 'Contenu', 'EXERCICE': 'Exercices' };
    return labels[type] || type;
  }

  // ═══ QUIZ ═══

  initQuiz(data: any): void {
    this.quizQuestions = data.questions || [];
    this.currentQuestionIndex = 0;
    this.quizScore = 0;
    this.quizFinished = false;
    this.loadQuestion();
  }

  loadQuestion(): void {
    if (this.currentQuestionIndex < this.quizQuestions.length) {
      this.currentQuestion = this.quizQuestions[this.currentQuestionIndex];
      this.answered = false;
      this.selectedAnswer = null;
    }
  }

  selectAnswer(index: number): void {
    if (this.answered) return;
    this.selectedAnswer = index;
    this.answered = true;
    if (index === this.currentQuestion.reponse_correcte) this.quizScore++;
  }

  nextQuestion(): void {
    this.currentQuestionIndex++;
    if (this.currentQuestionIndex >= this.quizQuestions.length) {
      this.quizFinished = true;
    } else {
      this.loadQuestion();
    }
  }

  isLastQuestion(): boolean {
    return this.currentQuestionIndex === this.quizQuestions.length - 1;
  }

  getScoreMessage(): string {
    const p = (this.quizScore / this.quizQuestions.length) * 100;
    if (p === 100) return 'Parfait ! 🎉';
    if (p >= 75)   return 'Très bien ! 👏';
    if (p >= 50)   return 'Bon travail ! 👍';
    return 'Continuez à vous entraîner ! 💪';
  }

  restartQuiz(): void {
    this.currentQuestionIndex = 0;
    this.quizScore = 0;
    this.quizFinished = false;
    this.loadQuestion();
  }

  // ═══ GAME ═══

  initGame(data: any): void {
    this.gameFinished = false;
    this.gameMoves = 0;
    this.gameTimer = data.timer || 60;
    this.flippedCards = [];

    let paires = data.paires || [];

    if (paires.length === 0 && data.theme && data.nombreCartes) {
      const theme = data.theme;
      const nombreCartes = data.nombreCartes;
      const allPairs = this.THEME_PAIRS[theme] || [];
      const pairesCount = Math.floor(nombreCartes / 2);
      paires = allPairs.slice(0, pairesCount);
    }

    const cards: any[] = [];
    paires.forEach((p: any) => {
      cards.push({ ...p, flipped: false, matched: false, uid: Math.random() });
      cards.push({ ...p, flipped: false, matched: false, uid: Math.random() });
    });

    this.memoryCards = cards.sort(() => Math.random() - 0.5);
  }

  flipCard(index: number): void {
    if (this.memoryCards[index].flipped || this.memoryCards[index].matched) return;
    if (this.flippedCards.length >= 2) return;

    this.memoryCards[index].flipped = true;
    this.flippedCards.push(index);

    if (this.flippedCards.length === 2) {
      this.gameMoves++;
      setTimeout(() => this.checkMatch(), 800);
    }
  }

  checkMatch(): void {
    const [i1, i2] = this.flippedCards;
    const card1 = this.memoryCards[i1];
    const card2 = this.memoryCards[i2];

    if (card1.id === card2.id) {
      card1.matched = true;
      card2.matched = true;
      if (this.memoryCards.every(c => c.matched)) this.gameFinished = true;
    } else {
      card1.flipped = false;
      card2.flipped = false;
    }
    this.flippedCards = [];
  }

  restartGame(): void {
    const rawData = this.playingActivity!.data;
    const data = typeof rawData === 'string' ? JSON.parse(rawData || '{}') : rawData;
    this.initGame(data);
  }

  // ═══ CONTENT ═══

  initContent(data: any): void {
    this.contentData = data;
    if (data.contentType === 'video' && data.videoUrl) {
      this.safeVideoUrl = this.getEmbedUrl(data.videoUrl);
    }
  }

  getEmbedUrl(youtubeUrl: string): SafeResourceUrl {
    const videoId = this.extractYoutubeId(youtubeUrl);
    if (videoId) {
      const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
      return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
    }
    return '';
  }

  private extractYoutubeId(url: string): string | null {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  }

  // ═══ EXERCICE ═══

  initExercice(data: any): void {
    this.exerciceData = data;
    this.exerciceCurrentRep = 1;
    this.exerciceFinished = false;
    this.startEtape(0);
  }

  startEtape(index: number): void {
    if (index >= this.exerciceData.etapes.length) {
      if (this.exerciceCurrentRep < this.exerciceData.repetitions) {
        this.exerciceCurrentRep++;
        this.startEtape(0);
      } else {
        this.exerciceFinished = true;
        if (this.exerciceInterval) clearInterval(this.exerciceInterval);
      }
      return;
    }

    this.currentEtape = this.exerciceData.etapes[index];
    this.exerciceCountdown = this.currentEtape.dureeSecondes;

    if (this.exerciceInterval) clearInterval(this.exerciceInterval);

    this.exerciceInterval = setInterval(() => {
      this.exerciceCountdown--;
      if (this.exerciceCountdown <= 0) {
        clearInterval(this.exerciceInterval);
        this.startEtape(index + 1);
      }
    }, 1000);
  }

  getEtapeProgress(): number {
    if (!this.currentEtape) return 0;
    return ((this.currentEtape.dureeSecondes - this.exerciceCountdown) / this.currentEtape.dureeSecondes) * 100;
  }
}