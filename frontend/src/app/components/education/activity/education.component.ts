import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivityService } from '../../../services/education/activity.service';
import { ActivityModel } from '../../../models/education/activity.model';
import { AuthService } from '../../../services/auth.service';
import { PatientProgressionService } from '../../../services/patient-progression.service';

@Component({
  selector: 'app-activity-player-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="container">


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

        <!-- Hero Banner -->
        <div class="edu-hero">
          <div class="edu-hero-glow"></div>
          <div class="edu-hero-content">
            <div class="edu-hero-icon">🧠</div>
            <h1 class="edu-hero-title">Espace Thérapeutique</h1>
            <p class="edu-hero-sub">Choisissez une activité pour progresser à votre rythme</p>
          </div>
          <!-- Progression chips for patients -->
          <div class="prog-chips" *ngIf="authService.getRole() === 'PATIENT'">
            <div class="prog-chip">
              <span class="chip-label">📝 Quiz</span>
              <span class="chip-value">{{ patientStadeQuiz }}</span>
            </div>
            <div class="prog-chip">
              <span class="chip-label">🎮 Jeux</span>
              <span class="chip-value">{{ patientStadeGame }}</span>
            </div>
            <div class="prog-chip score-chip">
              <span class="chip-label">⭐ Score</span>
              <span class="chip-value">{{ ((patientScoreQuiz + patientScoreGame) / 2).toFixed(0) }} pts</span>
            </div>
          </div>
        </div>

        <div class="type-buttons">
          <button class="type-btn quiz" (click)="selectType('QUIZ')">
            <div class="type-btn-glow"></div>
            <div class="icon">📝</div>
            <div class="type-name">Quiz</div>
            <div class="type-desc">Testez vos connaissances</div>
            <div class="type-arrow">→</div>
          </button>

          <button class="type-btn game" (click)="selectType('GAME')">
            <div class="type-btn-glow"></div>
            <div class="icon">🎮</div>
            <div class="type-name">Jeux</div>
            <div class="type-desc">Memory et puzzles</div>
            <div class="type-arrow">→</div>
          </button>

          <button class="type-btn content" (click)="selectType('CONTENT')">
            <div class="type-btn-glow"></div>
            <div class="icon">📺</div>
            <div class="type-name">Contenu</div>
            <div class="type-desc">Vidéos et articles</div>
            <div class="type-arrow">→</div>
          </button>

          <button class="type-btn exercice" (click)="selectType('EXERCICE')">
            <div class="type-btn-glow"></div>
            <div class="icon">🧘</div>
            <div class="type-name">Exercices</div>
            <div class="type-desc">Respiration et méditation</div>
            <div class="type-arrow">→</div>
          </button>
        </div>
      </div>

      <!-- Liste des activités du type sélectionné -->
      <div class="activities-list" *ngIf="selectedType && !playingActivity">
        <div class="header">
          <button class="btn-back" (click)="backToMenu()">← Retour</button>
          <h2 class="list-title">{{ getTypeLabel(selectedType) }}</h2>
        </div>

        <!-- Stage sections (for QUIZ and GAME with patient role) -->
        <ng-container *ngIf="(selectedType === 'QUIZ' || selectedType === 'GAME') && authService.getRole() === 'PATIENT'; else normalList">
          <div class="stages-container">

            <!-- LEGER -->
            <div class="stage-section" [class.stage-accessible]="getPatientStade() === 'LEGER'" [class.stage-completed]="isStageCompleted('LEGER')" [class.stage-locked]="isStageLockedFuture('LEGER')">
              <div class="stage-header">
                <div class="stage-title-row">
                  <span class="stage-icon">🌱</span>
                  <h3 class="stage-name">Stade Léger</h3>
                  <span class="stage-badge badge-leger" *ngIf="getPatientStade() === 'LEGER'">✅ Votre niveau actuel</span>
                  <span class="stage-badge badge-done" *ngIf="isStageCompleted('LEGER')">🏅 Déjà complété</span>
                </div>
                <div class="stage-lock" *ngIf="isStageLockedFuture('LEGER')">🔒 Verrouillé</div>
              </div>
              <div class="activities-grid">
                <div class="activity-card" [class.card-locked]="isStageLockedFuture('LEGER') || isStageCompleted('LEGER')"
                     *ngFor="let activity of getActivitiesForStage('LEGER')"
                     (click)="onActivityClick(activity, 'LEGER')">
                  <div class="activity-header">
                    <span class="activity-type" [class]="selectedType!.toLowerCase()">{{ selectedType }}</span>
                    <span class="activity-stade">{{ activity.stade }}</span>
                  </div>
                  <h3 class="activity-title">{{ activity.title }}</h3>
                  <p class="activity-desc">{{ activity.description }}</p>
                  <div class="activity-footer">
                    <span class="duration">⏱ {{ activity.estimatedMinutes }} min</span>
                    <button class="btn-play" [class.btn-locked]="isStageLockedFuture('LEGER') || isStageCompleted('LEGER')">
                      <ng-container *ngIf="isStageCompleted('LEGER')">✔ Fait</ng-container>
                      <ng-container *ngIf="isStageLockedFuture('LEGER')">🔒</ng-container>
                      <ng-container *ngIf="!isStageCompleted('LEGER') && !isStageLockedFuture('LEGER')">Jouer →</ng-container>
                    </button>
                  </div>
                </div>
                <div class="empty-stage" *ngIf="getActivitiesForStage('LEGER').length === 0">
                  <p>Aucune activité pour ce stade</p>
                </div>
              </div>
            </div>

            <!-- MODERE -->
            <div class="stage-section" [class.stage-accessible]="getPatientStade() === 'MODERE'" [class.stage-completed]="isStageCompleted('MODERE')" [class.stage-locked]="isStageLockedFuture('MODERE')">
              <div class="stage-header">
                <div class="stage-title-row">
                  <span class="stage-icon">⚡</span>
                  <h3 class="stage-name">Stade Modéré</h3>
                  <span class="stage-badge badge-modere" *ngIf="getPatientStade() === 'MODERE'">✅ Votre niveau actuel</span>
                  <span class="stage-badge badge-done" *ngIf="isStageCompleted('MODERE')">🏅 Déjà complété</span>
                </div>
                <div class="stage-lock" *ngIf="isStageLockedFuture('MODERE')">🔒 Verrouillé</div>
              </div>
              <div class="activities-grid">
                <div class="activity-card" [class.card-locked]="isStageLockedFuture('MODERE') || isStageCompleted('MODERE')"
                     *ngFor="let activity of getActivitiesForStage('MODERE')"
                     (click)="onActivityClick(activity, 'MODERE')">
                  <div class="activity-header">
                    <span class="activity-type" [class]="selectedType!.toLowerCase()">{{ selectedType }}</span>
                    <span class="activity-stade">{{ activity.stade }}</span>
                  </div>
                  <h3 class="activity-title">{{ activity.title }}</h3>
                  <p class="activity-desc">{{ activity.description }}</p>
                  <div class="activity-footer">
                    <span class="duration">⏱ {{ activity.estimatedMinutes }} min</span>
                    <button class="btn-play" [class.btn-locked]="isStageLockedFuture('MODERE') || isStageCompleted('MODERE')">
                      <ng-container *ngIf="isStageCompleted('MODERE')">✔ Fait</ng-container>
                      <ng-container *ngIf="isStageLockedFuture('MODERE')">🔒</ng-container>
                      <ng-container *ngIf="!isStageCompleted('MODERE') && !isStageLockedFuture('MODERE')">Jouer →</ng-container>
                    </button>
                  </div>
                </div>
                <div class="empty-stage" *ngIf="getActivitiesForStage('MODERE').length === 0">
                  <p>Aucune activité pour ce stade</p>
                </div>
              </div>
            </div>

            <!-- SEVERE -->
            <div class="stage-section" [class.stage-accessible]="getPatientStade() === 'SEVERE'" [class.stage-completed]="isStageCompleted('SEVERE')" [class.stage-locked]="isStageLockedFuture('SEVERE')">
              <div class="stage-header">
                <div class="stage-title-row">
                  <span class="stage-icon">🔥</span>
                  <h3 class="stage-name">Stade Sévère</h3>
                  <span class="stage-badge badge-severe" *ngIf="getPatientStade() === 'SEVERE'">✅ Votre niveau actuel</span>
                  <span class="stage-badge badge-done" *ngIf="isStageCompleted('SEVERE')">🏅 Déjà complété</span>
                </div>
                <div class="stage-lock" *ngIf="isStageLockedFuture('SEVERE')">🔒 Verrouillé</div>
              </div>
              <div class="activities-grid">
                <div class="activity-card" [class.card-locked]="isStageLockedFuture('SEVERE') || isStageCompleted('SEVERE')"
                     *ngFor="let activity of getActivitiesForStage('SEVERE')"
                     (click)="onActivityClick(activity, 'SEVERE')">
                  <div class="activity-header">
                    <span class="activity-type" [class]="selectedType!.toLowerCase()">{{ selectedType }}</span>
                    <span class="activity-stade">{{ activity.stade }}</span>
                  </div>
                  <h3 class="activity-title">{{ activity.title }}</h3>
                  <p class="activity-desc">{{ activity.description }}</p>
                  <div class="activity-footer">
                    <span class="duration">⏱ {{ activity.estimatedMinutes }} min</span>
                    <button class="btn-play" [class.btn-locked]="isStageLockedFuture('SEVERE') || isStageCompleted('SEVERE')">
                      <ng-container *ngIf="isStageCompleted('SEVERE')">✔ Fait</ng-container>
                      <ng-container *ngIf="isStageLockedFuture('SEVERE')">🔒</ng-container>
                      <ng-container *ngIf="!isStageCompleted('SEVERE') && !isStageLockedFuture('SEVERE')">Jouer →</ng-container>
                    </button>
                  </div>
                </div>
                <div class="empty-stage" *ngIf="getActivitiesForStage('SEVERE').length === 0">
                  <p>Aucune activité pour ce stade</p>
                </div>
              </div>
            </div>

          </div>
        </ng-container>

        <!-- Normal list for non-patients or CONTENT/EXERCICE -->
        <ng-template #normalList>
          <div class="activities-grid">
            <div class="activity-card"
                 *ngFor="let activity of filteredActivities"
                 (click)="playActivity(activity)">
              <div class="activity-header">
                <span class="activity-type" [class]="selectedType!.toLowerCase()">
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
        </ng-template>
      </div>

      <!-- Player de l'activité sélectionnée -->
      <div class="activity-player" *ngIf="playingActivity">
        <div class="player-header">
          <button class="btn-back" (click)="stopActivity()">← Quitter</button>
          <h2>{{ playingActivity.title }}</h2>
        </div>

        <!-- QUIZ Player -->
        <div class="quiz-player" *ngIf="playingActivity.type === 'QUIZ'">
          <div class="quiz-status-bar d-flex justify-content-between align-items-center mb-4 px-3 py-2 bg-light rounded-3 shadow-sm border border-secondary border-opacity-10">
            <div class="quiz-progress fw-bold text-primary">
              <span class="badge bg-primary me-2">Q{{ currentQuestionIndex + 1 }}</span> Question {{ currentQuestionIndex + 1 }} / {{ quizQuestions.length }}
            </div>
            <div class="timer-badge" [class.danger]="timerRemaining < 10">
              <span class="timer-icon">⏱️</span>
              <span class="timer-text fw-bold">{{ getFormattedTime() }}</span>
            </div>
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
            <!-- Échec / Timeout -->
            <ng-container *ngIf="isTimeout || isQuizFailed()">
              <div class="result-icon fail-icon">😔</div>
              <h2 class="result-title fail-title" *ngIf="isTimeout">⏰ Temps écoulé !</h2>
              <h2 class="result-title fail-title" *ngIf="!isTimeout">Quiz échoué</h2>
              <div class="score score-fail">{{ quizScore }} / {{ quizQuestions.length }}</div>
              <p class="score-message" *ngIf="isTimeout">Le temps imparti est dépassé.</p>
              <p class="score-message" *ngIf="!isTimeout">Vous n'avez pas atteint le score requis.</p>
              <div class="result-actions">
                <!-- Bouton passer au stade suivant (masqué si dernier stade) -->
                <button class="btn-purple" (click)="goToNextStade()" *ngIf="!isLastStade()">
                  ⏩ Passer au stade suivant
                </button>
                <button class="btn-outline-purple" (click)="stopActivity()">📚 Choisir une autre activité</button>
              </div>
            </ng-container>
            <!-- Succès -->
            <ng-container *ngIf="!isTimeout && !isQuizFailed()">
              <div class="result-icon success-icon">🎉</div>
              <h2 class="result-title success-title">Bravo !</h2>
              <div class="score score-success">{{ quizScore }} / {{ quizQuestions.length }}</div>
              <p class="score-message">{{ getScoreMessage() }}</p>
              <div class="result-actions">
                <button class="btn-outline-purple" (click)="stopActivity()">📚 Choisir une autre activité</button>
              </div>
            </ng-container>
          </div>
        </div>

        <!-- GAME Player (Memory) -->
        <div class="game-player" *ngIf="playingActivity.type === 'GAME'">
          <div class="game-info">
            <div class="timer-badge" [class.danger]="timerRemaining < 10">
              <span class="timer-icon">⏱️</span>
              <span class="timer-text">{{ getFormattedTime() }}</span>
            </div>
            <div class="moves-badge">
              <span class="moves-icon">🎮</span>
              <span class="moves-text">Coups : {{ gameMoves }}</span>
            </div>
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
            <!-- Échec -->
            <ng-container *ngIf="isTimeout || !gameSuccess">
              <div class="result-icon fail-icon">😔</div>
              <h2 class="result-title fail-title" *ngIf="isTimeout">⏰ Temps écoulé !</h2>
              <h2 class="result-title fail-title" *ngIf="!isTimeout">😕 Dommage !</h2>
              <p class="score-message" *ngIf="isTimeout">La limite de temps est dépassée.</p>
              <p class="score-message" *ngIf="!isTimeout">Trop d'essais pour ce niveau ({{ gameMoves }} coups).</p>
              <div class="result-actions">
                <button class="btn-purple" (click)="goToNextStade()" *ngIf="!isLastStade()">
                  ⏩ Passer au stade suivant
                </button>
                <button class="btn-outline-purple" (click)="stopActivity()">📚 Choisir une autre activité</button>
              </div>
            </ng-container>
            <!-- Succès -->
            <ng-container *ngIf="!isTimeout && gameSuccess">
              <div class="result-icon success-icon">🎉</div>
              <h2 class="result-title success-title">Bravo !</h2>
              <p class="score-message">Félicitations, vous avez trouvé toutes les paires en {{ gameMoves }} coups !</p>
              <div class="result-actions">
                <button class="btn-outline-purple" (click)="stopActivity()">📚 Choisir une autre activité</button>
              </div>
            </ng-container>
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
      background: #faf8ff;
      min-height: 100vh;
    }

    /* ═══ Hero Banner ═══ */
    .edu-hero {
      position: relative;
      background: linear-gradient(135deg, #800080, #5c0057, #3d0040);
      border-radius: 24px;
      padding: 48px 40px 36px;
      margin-bottom: 40px;
      overflow: hidden;
      color: white;
      text-align: center;
      box-shadow: 0 12px 40px rgba(128,0,128,0.35);
    }
    .edu-hero-glow {
      position: absolute; top: -60px; right: -60px;
      width: 260px; height: 260px; border-radius: 50%;
      background: rgba(255,255,255,0.07);
      pointer-events: none;
    }
    .edu-hero-content { position: relative; z-index: 1; }
    .edu-hero-icon { font-size: 56px; margin-bottom: 12px; }
    .edu-hero-title { font-size: 34px; font-weight: 800; margin: 0 0 8px; letter-spacing: -0.5px; }
    .edu-hero-sub { font-size: 16px; opacity: 0.8; margin: 0 0 28px; }

    .prog-chips {
      display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;
      position: relative; z-index: 1;
    }
    .prog-chip {
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.25);
      border-radius: 50px;
      padding: 8px 20px;
      display: flex; align-items: center; gap: 10px;
      backdrop-filter: blur(4px);
    }
    .chip-label { font-size: 12px; opacity: 0.8; font-weight: 600; }
    .chip-value { font-size: 14px; font-weight: 800; background: rgba(255,255,255,0.25); border-radius: 20px; padding: 2px 10px; }
    .score-chip .chip-value { background: rgba(255,215,0,0.3); color: #ffe57a; }

    /* ═══ Loading & Error ═══ */
    .loading { text-align: center; padding: 60px 20px; }

    .spinner {
      border: 4px solid #f3e8ff;
      border-top: 4px solid #800080;
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
      background: #800080; color: white; border: none;
      padding: 10px 24px; border-radius: 8px; cursor: pointer;
      font-weight: 600; margin-top: 16px;
    }

    /* ═══ Menu de sélection ═══ */
    .selection-menu { text-align: center; padding: 0 20px 40px; }

    .main-title {
      font-size: 32px; font-weight: 700;
      margin-bottom: 40px; color: #1e293b;
      margin-top: -60px; color: #1e293b;
    }

    /* ✅ Grille 2 colonnes fixes */
    .type-buttons {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      max-width: 640px;
      margin: 0 auto;
    }

    .type-btn {
      position: relative; overflow: hidden;
      background: white; border: 2px solid #f0e0f0;
      border-radius: 20px; padding: 32px 20px 24px; cursor: pointer;
      transition: all 0.3s; box-shadow: 0 4px 16px rgba(128,0,128,0.08);
      text-align: center;
    }
    .type-btn-glow {
      position: absolute; top: -40px; right: -40px;
      width: 120px; height: 120px; border-radius: 50%;
      background: rgba(128,0,128,0.06);
      transition: all 0.4s;
      pointer-events: none;
    }
    .type-btn:hover {
      transform: translateY(-6px);
      box-shadow: 0 12px 32px rgba(128,0,128,0.2);
      border-color: #800080;
    }
    .type-btn:hover .type-btn-glow { width: 200px; height: 200px; top: -60px; right: -60px; background: rgba(128,0,128,0.1); }
    .type-btn:hover .type-arrow { opacity: 1; transform: translateX(4px); }

    .type-btn .icon { font-size: 48px; margin-bottom: 14px; }
    .type-btn .type-name { font-size: 22px; font-weight: 800; margin-bottom: 6px; color: #3d0040; }
    .type-btn .type-desc { font-size: 13px; color: #94658a; }
    .type-btn .type-arrow {
      font-size: 20px; color: #800080; margin-top: 12px;
      opacity: 0; transition: all 0.3s; display: block;
    }

    /* ═══ Liste des activités ═══ */
    .header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }

    .btn-back {
      background: #f3e8ff; border: none; padding: 10px 18px;
      border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 700;
      color: #800080; transition: all 0.2s;
    }
    .btn-back:hover { background: #e9d5ff; transform: translateX(-2px); }

    .list-title { font-size: 26px; font-weight: 800; color: #3d0040; }

    .activities-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }

    .activity-card {
      background: white; border-radius: 14px; padding: 20px;
      cursor: pointer; transition: all 0.3s;
      box-shadow: 0 2px 10px rgba(128,0,128,0.08);
      border: 2px solid transparent;
    }
    .activity-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(128,0,128,0.18); border-color: #e9d5ff; }

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
      background: linear-gradient(135deg, #800080, #5c0057); color: white; border: none;
      padding: 8px 18px; border-radius: 8px; cursor: pointer;
      font-weight: 700; font-size: 14px; transition: all 0.2s;
      box-shadow: 0 3px 10px rgba(128,0,128,0.3);
    }
    .btn-play:hover { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(128,0,128,0.4); }

    /* ═══ Player header ═══ */
    .player-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .player-header h2 { font-size: 24px; font-weight: 700; color: #1e293b; }

    /* ═══ Quiz Player Layout ═══ */
    .quiz-status-bar {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      background: linear-gradient(135deg, #faf8ff, #f3e8ff);
      border: 1px solid #e9d5ff;
      padding: 12px 20px;
      border-radius: 14px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(128,0,128,0.08);
    }
    .quiz-progress { display: flex; align-items: center; gap: 8px; font-size: 16px; color: #800080; font-weight: 700; }

    /* ═══ Timer & Info Badges ═══ */
    .timer-badge, .moves-badge {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 10px;
      padding: 10px 24px;
      border-radius: 10px;
      background: white;
      color: #3d0040;
      font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
      font-size: 22px;
      font-weight: 800;
      border: 2px solid #e9d5ff;
      box-shadow: 0 2px 4px rgba(128,0,128,0.08);
      min-width: 120px;
    }
    .timer-badge.danger {
      background: #fee2e2;
      color: #ef4444;
      border-color: #fecaca;
      animation: pulse-red-alert 0.8s infinite;
    }
    @keyframes pulse-red-alert {
      0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
      50% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
      100% { transform: scale(1); }
    }
    .timer-icon { font-size: 20px; }

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
    .option-btn:hover:not(:disabled) { background: #f3e8ff; border-color: #c084c8; }
    .option-btn.correct { background: #d1fae5; border-color: #10b981; color: #065f46; }
    .option-btn.wrong   { background: #fee2e2; border-color: #ef4444; color: #991b1b; }

    .explanation {
      background: #faf5ff; border-left: 4px solid #800080;
      padding: 16px; border-radius: 8px; margin-bottom: 20px; font-size: 14px;
    }

    .btn-next {
      background: linear-gradient(135deg, #800080, #5c0057); color: white; border: none;
      padding: 12px 24px; border-radius: 10px; cursor: pointer;
      font-weight: 700; font-size: 16px; width: 100%;
      box-shadow: 0 4px 14px rgba(128,0,128,0.3);
      transition: all 0.2s;
    }
    .btn-next:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(128,0,128,0.4); }

    /* ═══ Result Cards ═══ */
    .quiz-result, .game-result, .exercice-result {
      text-align: center; background: white;
      border-radius: 20px; padding: 48px;
      box-shadow: 0 8px 32px rgba(128,0,128,0.12);
      border: 1px solid #f0e0f0;
      margin-top: 24px;
    }
    .result-icon { font-size: 72px; margin-bottom: 12px; }
    .result-title { font-size: 32px; font-weight: 800; margin-bottom: 8px; }
    .fail-title   { color: #800080; }
    .success-title { color: #059669; }
    .score { font-size: 64px; font-weight: 800; margin: 16px 0; }
    .score-success { color: #800080; }
    .score-fail    { color: #ef4444; }
    .score-message { font-size: 18px; color: #64748b; margin-bottom: 28px; }
    .result-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 8px; }

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
      aspect-ratio: 1; background: linear-gradient(135deg, #800080, #5c0057);
      border-radius: 12px; cursor: pointer;
      position: relative; transition: transform 0.3s;
    }
    .memory-card:hover { transform: scale(1.06); }

    .memory-card.flipped,
    .memory-card.matched {
      background: white; border: 3px solid #800080;
    }
    .memory-card.matched { background: #f0fdf4; border-color: #10b981; }

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
      background: linear-gradient(135deg, #800080, #5c0057); color: white;
      width: 48px; height: 48px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; margin: 0 auto 16px;
    }

    .etape-consigne { font-size: 24px; margin-bottom: 32px; color: #3d0040; }
    .countdown { font-size: 72px; font-weight: 800; color: #800080; margin-bottom: 24px; }

    .progress-bar {
      background: #f0e0f0; height: 12px;
      border-radius: 6px; overflow: hidden;
    }
    .progress { background: linear-gradient(90deg, #800080, #c084c8); height: 100%; transition: width 0.3s; }

    /* ═══ Boutons communs Purple ═══ */
    .btn-primary {
      background: linear-gradient(135deg, #800080, #5c0057); color: white; border: none;
      padding: 12px 32px; border-radius: 10px; cursor: pointer;
      font-weight: 700; font-size: 16px; margin: 8px;
      box-shadow: 0 4px 14px rgba(128,0,128,0.3); transition: all 0.2s;
    }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(128,0,128,0.4); }

    .btn-secondary {
      background: #f3e8ff; color: #5c0057; border: none;
      padding: 12px 32px; border-radius: 10px; cursor: pointer;
      font-weight: 700; font-size: 16px; margin: 8px; transition: all 0.2s;
    }
    .btn-secondary:hover { background: #e9d5ff; }

    .btn-purple {
      background: linear-gradient(135deg, #800080, #5c0057); color: white; border: none;
      padding: 13px 32px; border-radius: 12px; cursor: pointer;
      font-weight: 700; font-size: 15px;
      box-shadow: 0 4px 14px rgba(128,0,128,0.35); transition: all 0.25s;
    }
    .btn-purple:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(128,0,128,0.45); }

    .btn-outline-purple {
      background: white; color: #800080;
      border: 2px solid #800080;
      padding: 12px 28px; border-radius: 12px; cursor: pointer;
      font-weight: 700; font-size: 15px; transition: all 0.25s;
    }
    .btn-outline-purple:hover { background: #faf5ff; transform: translateY(-2px); box-shadow: 0 4px 14px rgba(128,0,128,0.15); }

    .empty-state { grid-column: 1 / -1; text-align: center; padding: 48px; color: #64748b; }

    .game-result,
    .exercice-result {
      text-align: center; background: white;
      border-radius: 12px; padding: 48px; margin-top: 24px;
    }

    /* ═══ Stage Sections ═══ */
    .stages-container {
      display: flex;
      flex-direction: column;
      gap: 28px;
    }

    .stage-section {
      border: 2px solid #f0e0f0;
      border-radius: 18px;
      padding: 24px;
      background: white;
      transition: all 0.3s;
    }

    .stage-section.stage-accessible {
      border-color: #800080;
      box-shadow: 0 6px 24px rgba(128,0,128,0.18);
      background: linear-gradient(to bottom right, #faf5ff, #ffffff);
    }

    .stage-section.stage-completed {
      border-color: #10b981;
      background: linear-gradient(to bottom right, #f0fdf4, #ffffff);
      opacity: 0.85;
    }

    .stage-section.stage-locked {
      border-color: #e2e8f0;
      background: #f8fafc;
      opacity: 0.55;
    }

    .stage-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .stage-title-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .stage-icon { font-size: 28px; }

    .stage-name {
      font-size: 20px;
      font-weight: 800;
      color: #3d0040;
      margin: 0;
    }

    .stage-badge {
      padding: 4px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
    }

    .badge-leger  { background: #f3e8ff; color: #800080; }
    .badge-modere { background: #ede9fe; color: #5b21b6; }
    .badge-severe { background: #fce7f3; color: #9d174d; }
    .badge-done   { background: #d1fae5; color: #065f46; }

    .stage-lock {
      font-size: 13px;
      font-weight: 700;
      color: #94a3b8;
      background: #f1f5f9;
      padding: 6px 14px;
      border-radius: 20px;
    }

    .card-locked {
      opacity: 0.55;
      cursor: not-allowed !important;
      pointer-events: none;
    }

    .btn-locked {
      background: #c4a0c4 !important;
      cursor: not-allowed;
    }

    .empty-state, .empty-stage {
      grid-column: 1 / -1;
      text-align: center;
      padding: 28px;
      color: #c084c8;
      font-size: 14px;
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

  patientScoreQuiz: number = 0;
  patientStadeQuiz: string = 'LEGER';
  patientScoreGame: number = 0;
  patientStadeGame: string = 'LEGER';

  // Timer state
  timerRemaining: number = 0;
  activeInterval: any = null;
  startTime: number = 0;

  // Quiz state
  quizQuestions: any[] = [];
  currentQuestionIndex = 0;
  currentQuestion: any = null;
  answered = false;
  selectedAnswer: number | null = null;
  quizScore = 0;
  quizFinished = false;
  isTimeout: boolean = false;

  // Game state
  memoryCards: any[] = [];
  gameMoves = 0;
  gameFinished = false;
  gameSuccess: boolean = true;
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
    private router: Router,
    public authService: AuthService,
    private progressionService: PatientProgressionService
  ) { }

  ngOnInit(): void {
    this.loadActivities();
    this.loadPatientProgression();
  }

  loadPatientProgression(): void {
    const user = this.authService.getCurrentUser();
    if (user && user.id && this.authService.getRole() === 'PATIENT') {
      this.progressionService.getScoreAndStade(user.id).subscribe({
        next: (data) => {
          this.patientScoreQuiz = data.scoreQuiz;
          this.patientStadeQuiz = data.stadeQuiz;
          this.patientScoreGame = data.scoreGame;
          this.patientStadeGame = data.stadeGame;
          if (this.selectedType) {
            this.selectType(this.selectedType);
          }
        },
        error: (err) => console.error('Erreur chargement progression:', err)
      });
    }
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
    // Show all activities of the selected type (stage filtering is handled in the template for patients)
    this.filteredActivities = this.activities.filter(a => a.type === type);
  }

  /** Returns the patient's current stage for the selected type */
  getPatientStade(): string {
    if (this.selectedType === 'QUIZ') return this.patientStadeQuiz;
    if (this.selectedType === 'GAME') return this.patientStadeGame;
    return 'LEGER';
  }

  /** Returns all activities from the full list for a given stage */
  getActivitiesForStage(stade: string): ActivityModel[] {
    return this.activities.filter(a => a.type === this.selectedType && a.stade === stade);
  }

  private readonly STAGE_ORDER = ['LEGER', 'MODERE', 'SEVERE'];

  /** True if the patient has already passed this stage (it's behind their current stage) */
  isStageCompleted(stade: string): boolean {
    const currentIndex = this.STAGE_ORDER.indexOf(this.getPatientStade());
    const stadeIndex = this.STAGE_ORDER.indexOf(stade);
    return stadeIndex < currentIndex;
  }

  /** True if the stage is ahead of the patient's current stage (not yet unlocked) */
  isStageLockedFuture(stade: string): boolean {
    const currentIndex = this.STAGE_ORDER.indexOf(this.getPatientStade());
    const stadeIndex = this.STAGE_ORDER.indexOf(stade);
    return stadeIndex > currentIndex;
  }

  /** Click handler that respects stage access */
  onActivityClick(activity: ActivityModel, stade: string): void {
    if (this.isStageLockedFuture(stade) || this.isStageCompleted(stade)) return;
    this.playActivity(activity);
  }

  submitProgression(bonnesReponses: number, mauvaisesReponses: number): void {
    if (this.activeInterval) {
      clearInterval(this.activeInterval);
      this.activeInterval = null;
    }

    const elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);

    const user = this.authService.getCurrentUser();
    if (user && user.id && this.playingActivity && this.playingActivity.id) {
      const payload = {
        userId: user.id,
        activityId: this.playingActivity.id,
        bonnesReponses: bonnesReponses,
        mauvaisesReponses: mauvaisesReponses,
        dureeSecondes: elapsedSeconds
      };

      this.progressionService.submitSession(payload).subscribe({
        next: (res) => {
          console.log('Session enregistrée ! Nouveau stade:', res.currentStade);
          this.loadPatientProgression(); // Recharge le nouveau stade
        },
        error: (err) => console.error('Erreur de soumission:', err)
      });
    }
  }

  startActivityTimer(seconds: number): void {
    if (this.activeInterval) clearInterval(this.activeInterval);

    this.timerRemaining = seconds;
    this.startTime = Date.now();

    this.activeInterval = setInterval(() => {
      this.timerRemaining--;
      if (this.timerRemaining <= 0) {
        this.onTimeout();
      }
    }, 1000);
  }

  onTimeout(): void {
    if (this.activeInterval) {
      clearInterval(this.activeInterval);
      this.activeInterval = null;
    }
    this.isTimeout = true;

    if (this.playingActivity?.type === 'QUIZ') {
      this.quizFinished = true;
      const total = this.quizQuestions.length;
      this.submitProgression(0, total);
    } else if (this.playingActivity?.type === 'GAME') {
      this.gameFinished = true;
      this.gameSuccess = false;
      const totalPaires = this.memoryCards.length / 2;
      this.submitProgression(0, totalPaires + 1);
    }
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
        case 'QUIZ': this.initQuiz(data); break;
        case 'GAME': this.initGame(data); break;
        case 'CONTENT': this.initContent(data); break;
        case 'EXERCICE': this.initExercice(data); break;
      }
    } catch (e) {
      console.error('Erreur lors du parsing des données:', e);
      this.errorMessage = 'Données d\'activité invalides';
      this.playingActivity = null;
    }
  }

  getFormattedTime(): string {
    const minutes = Math.floor(this.timerRemaining / 60);
    const seconds = this.timerRemaining % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  stopActivity(): void {
    this.playingActivity = null;
    this.selectedType = null;
    this.resetAllStates();
  }

  /** Revient à la liste du type actuel (QUIZ ou GAME) avec le nouveau stade débloqué */
  goToNextStade(): void {
    const currentType = this.selectedType; // garde le type (QUIZ ou GAME)
    this.playingActivity = null;
    this.resetAllStates();
    // Recharge la progression depuis le backend (le stade a changé après la session)
    const user = this.authService.getCurrentUser();
    if (user && user.id && this.authService.getRole() === 'PATIENT') {
      this.progressionService.getScoreAndStade(user.id).subscribe({
        next: (data) => {
          this.patientScoreQuiz = data.scoreQuiz;
          this.patientStadeQuiz = data.stadeQuiz;
          this.patientScoreGame = data.scoreGame;
          this.patientStadeGame = data.stadeGame;
          // Remet le type sélectionné pour afficher la liste avec le nouveau stade
          if (currentType) {
            this.selectType(currentType);
          }
        },
        error: () => {
          if (currentType) this.selectType(currentType);
        }
      });
    } else {
      if (currentType) this.selectType(currentType);
    }
  }

  resetAllStates(): void {
    if (this.activeInterval) {
      clearInterval(this.activeInterval);
      this.activeInterval = null;
    }
    this.quizQuestions = [];
    this.currentQuestionIndex = 0;
    this.answered = false;
    this.quizScore = 0;
    this.quizFinished = false;
    this.isTimeout = false;

    this.memoryCards = [];
    this.gameMoves = 0;
    this.gameFinished = false;
    this.gameSuccess = true;

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
    this.isTimeout = false;
    this.loadQuestion();

    // Use activity.estimatedMinutes as the ONLY source of truth for duration
    // This resolves all discrepancies between the list view and the player
    let durationSeconds = 120; // Default fallback
    if (this.playingActivity && this.playingActivity.estimatedMinutes) {
      durationSeconds = this.playingActivity.estimatedMinutes * 60;
    }
    
    this.startActivityTimer(durationSeconds);
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
      const mauvaisesReponses = this.quizQuestions.length - this.quizScore;
      this.submitProgression(this.quizScore, mauvaisesReponses);
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
    if (p >= 75) return 'Très bien ! 👏';
    if (p >= 50) return 'Bon travail ! 👍';
    return 'Continuez à vous entraîner ! 💪';
  }

  /** True if the quiz is finished and the score is below 50% */
  isQuizFailed(): boolean {
    if (!this.quizFinished || this.quizQuestions.length === 0) return false;
    return (this.quizScore / this.quizQuestions.length) < 0.5;
  }

  /** True if the activity being played is at the last stage (SEVERE) — no next stage to go to */
  isLastStade(): boolean {
    // Use the stade of the activity being played, not the patient's current stade
    // (patientStade can be updated async after session submission)
    if (this.playingActivity) {
      return this.playingActivity.stade === 'SEVERE';
    }
    return this.getPatientStade() === 'SEVERE';
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
    this.flippedCards = [];

    // Use activity.estimatedMinutes as the ONLY source of truth for duration
    let durationSeconds = 60; // Default fallback
    if (this.playingActivity && this.playingActivity.estimatedMinutes) {
      durationSeconds = this.playingActivity.estimatedMinutes * 60;
    }

    this.startActivityTimer(durationSeconds);

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
      if (this.memoryCards.every(c => c.matched)) {
        this.gameFinished = true;

        const totalPaires = this.memoryCards.length / 2;

        // --- FAIR LOGIC ---
        // Success if Moves <= 3 * totalPaires
        this.gameSuccess = (this.gameMoves <= totalPaires * 3);

        let finalMauvaises = 0;
        if (!this.gameSuccess) {
          finalMauvaises = totalPaires + 1; // Mark as failure in backend
        }

        this.submitProgression(totalPaires, finalMauvaises);
      }
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