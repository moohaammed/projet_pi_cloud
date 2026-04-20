import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivityService } from '../../../services/education/activity.service';
import { ActivityModel } from '../../../models/education/activity.model';
import { AuthService } from '../../../services/auth.service';
import { PatientProgressionService } from '../../../services/patient-progression.service';
import { AudioSessionService } from '../../../services/education/audio-session.service';
import { AlzheimerAccessibilityService } from '../../../services/alz-accessibility.service';

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
        <div class="menu-inner">
          <!-- Hero Banner inside menu-inner -->
          <div class="edu-hero">
            <div class="edu-hero-glow"></div>
            <div class="edu-hero-content">
              <div class="header-badge">Espace Santé & Cognitive</div>
              <h1 class="edu-hero-title">Espace Thérapeutique</h1>
              <p class="edu-hero-sub">Choisissez une activité pour progresser à votre rythme</p>
            </div>
            <!-- Progression bar (stats-bar style) -->
            <div class="stats-bar" *ngIf="authService.getRole() === 'PATIENT'">
              <div class="stat">
                <div class="stat-icon upcoming">📝</div>
                <div class="stat-info">
                  <span class="stat-number">{{ patientStadeQuiz }}</span>
                  <span class="stat-label">Quiz</span>
                </div>
              </div>
              <div class="stat-divider"></div>
              <div class="stat">
                <div class="stat-icon upcoming">🎮</div>
                <div class="stat-info">
                  <span class="stat-number">{{ patientStadeGame }}</span>
                  <span class="stat-label">Jeux</span>
                </div>
              </div>
              <div class="stat-divider"></div>
              <div class="stat">
                <div class="stat-icon total">⭐</div>
                <div class="stat-info">
                  <span class="stat-number">{{ ((patientScoreQuiz + patientScoreGame) / 2).toFixed(0) }} pts</span>
                  <span class="stat-label">Score</span>
                </div>
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
      </div>

      <!-- Liste des activités du type sélectionné -->
      <div class="activities-list" *ngIf="selectedType && !playingActivity">
        <div class="list-inner">
          <div class="edu-hero list-hero-cadre">
            <div class="edu-hero-glow"></div>
            <div class="edu-hero-content">
              <div class="header-badge">{{ selectedType }}</div>
              <h1 class="edu-hero-title">{{ getTypeLabel(selectedType) }}</h1>
              <p class="edu-hero-sub">Parcourez les activités disponibles et progressez étape par étape.</p>
            </div>
            <button class="btn-reset" *ngIf="authService.getRole() === 'PATIENT' && (selectedType === 'QUIZ' || selectedType === 'GAME')" (click)="resetLevel()">
              🔄 Réinitialiser mon niveau
            </button>
            <button class="btn-back-floating" (click)="backToMenu()">← Retour</button>
          </div>

          <!-- Stage sections (for QUIZ and GAME with patient role) -->
          <ng-container *ngIf="(selectedType === 'QUIZ' || selectedType === 'GAME') && authService.getRole() === 'PATIENT'; else normalList">
            <div class="stages-container">

            <!-- LEGER -->
            <div class="stage-section" [class.stage-accessible]="getPatientStade() === 'LEGER' || isStageCompleted('LEGER')" [class.stage-completed]="isStageCompleted('LEGER')" [class.stage-locked]="isStageLocked('LEGER')">
              <div class="stage-header">
                <div class="stage-title-row">
                  <span class="stage-icon">🌱</span>
                  <h3 class="stage-name">Stade Léger</h3>
                  <span class="stage-badge badge-leger" *ngIf="getPatientStade() === 'LEGER' && !isStageCompleted('LEGER')">✅ Votre niveau actuel</span>
                  <span class="stage-badge badge-done" *ngIf="isStageCompleted('LEGER')">🏅 Complété</span>
                </div>
                <div class="stage-lock" *ngIf="isStageLocked('LEGER')">🔒 Verrouillé</div>
              </div>
              <div class="activities-grid">
                <div class="activity-card" [class.card-locked]="isStageLocked('LEGER')"
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
                    <button class="btn-play" [class.btn-locked]="isStageLocked('LEGER')">
                      <ng-container *ngIf="isStageLocked('LEGER')">🔒</ng-container>
                      <ng-container *ngIf="!isStageLocked('LEGER') && isStageCompleted('LEGER')">Rejouer →</ng-container>
                      <ng-container *ngIf="!isStageLocked('LEGER') && !isStageCompleted('LEGER')">Jouer →</ng-container>
                    </button>
                  </div>
                </div>
                <div class="empty-stage" *ngIf="getActivitiesForStage('LEGER').length === 0">
                  <p>Aucune activité pour ce stade</p>
                </div>
              </div>
            </div>

            <!-- MODERE -->
            <div class="stage-section" [class.stage-accessible]="getPatientStade() === 'MODERE' || isStageCompleted('MODERE')" [class.stage-completed]="isStageCompleted('MODERE')" [class.stage-locked]="isStageLocked('MODERE')">
              <div class="stage-header">
                <div class="stage-title-row">
                  <span class="stage-icon">⚡</span>
                  <h3 class="stage-name">Stade Modéré</h3>
                  <span class="stage-badge badge-modere" *ngIf="getPatientStade() === 'MODERE' && !isStageCompleted('MODERE')">✅ Votre niveau actuel</span>
                  <span class="stage-badge badge-done" *ngIf="isStageCompleted('MODERE')">🏅 Complété</span>
                </div>
                <div class="stage-lock" *ngIf="isStageLocked('MODERE')">🔒 Verrouillé</div>
              </div>
              <div class="activities-grid">
                <div class="activity-card" [class.card-locked]="isStageLocked('MODERE')"
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
                    <button class="btn-play" [class.btn-locked]="isStageLocked('MODERE')">
                      <ng-container *ngIf="isStageLocked('MODERE')">🔒</ng-container>
                      <ng-container *ngIf="!isStageLocked('MODERE') && isStageCompleted('MODERE')">Rejouer →</ng-container>
                      <ng-container *ngIf="!isStageLocked('MODERE') && !isStageCompleted('MODERE')">Jouer →</ng-container>
                    </button>
                  </div>
                </div>
                <div class="empty-stage" *ngIf="getActivitiesForStage('MODERE').length === 0">
                  <p>Aucune activité pour ce stade</p>
                </div>
              </div>
            </div>

            <!-- SEVERE -->
            <div class="stage-section" [class.stage-accessible]="getPatientStade() === 'SEVERE' || isStageCompleted('SEVERE')" [class.stage-completed]="isStageCompleted('SEVERE')" [class.stage-locked]="isStageLocked('SEVERE')">
              <div class="stage-header">
                <div class="stage-title-row">
                  <span class="stage-icon">🔥</span>
                  <h3 class="stage-name">Stade Sévère</h3>
                  <span class="stage-badge badge-severe" *ngIf="getPatientStade() === 'SEVERE' && !isStageCompleted('SEVERE')">✅ Votre niveau actuel</span>
                  <span class="stage-badge badge-done" *ngIf="isStageCompleted('SEVERE')">🏅 Complété</span>
                </div>
                <div class="stage-lock" *ngIf="isStageLocked('SEVERE')">🔒 Verrouillé</div>
              </div>
              <div class="activities-grid">
                <div class="activity-card" [class.card-locked]="isStageLocked('SEVERE')"
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
                    <button class="btn-play" [class.btn-locked]="isStageLocked('SEVERE')">
                      <ng-container *ngIf="isStageLocked('SEVERE')">🔒</ng-container>
                      <ng-container *ngIf="!isStageLocked('SEVERE') && isStageCompleted('SEVERE')">Rejouer →</ng-container>
                      <ng-container *ngIf="!isStageLocked('SEVERE') && !isStageCompleted('SEVERE')">Jouer →</ng-container>
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
          <div class="content-list-grid">
            <div class="content-card-modern"
                 *ngFor="let activity of filteredActivities"
                 (click)="playActivity(activity)">
              
              <!-- Premium Card Design for All Types -->
              <div class="content-card-bg"></div>
              <div class="content-card-glass">
                <div class="activity-header">
                  <span class="activity-type content-badge-premium" [ngSwitch]="selectedType">
                    <ng-container *ngSwitchCase="'CONTENT'"><i class="fa-solid fa-play-circle me-1"></i> Contenu</ng-container>
                    <ng-container *ngSwitchCase="'EXERCICE'"><i class="fa-solid fa-person-running me-1"></i> Exercice</ng-container>
                    <ng-container *ngSwitchCase="'QUIZ'"><i class="fa-solid fa-clipboard-question me-1"></i> Quiz</ng-container>
                    <ng-container *ngSwitchCase="'GAME'"><i class="fa-solid fa-gamepad me-1"></i> Jeu</ng-container>
                    <ng-container *ngSwitchDefault><i class="fa-solid fa-star me-1"></i> {{ selectedType }}</ng-container>
                  </span>
                  <span class="activity-stade premium-stade">{{ activity.stade }}</span>
                </div>
                <h3 class="activity-title content-title-premium">{{ activity.title }}</h3>
                <p class="activity-desc content-desc-premium">{{ activity.description }}</p>
                <div class="activity-footer content-footer-premium">
                  <span class="duration text-white-50"><i class="fa-regular fa-clock me-1"></i> {{ activity.estimatedMinutes }} min</span>
                  <button class="btn-play premium-play">
                    <ng-container *ngIf="selectedType === 'CONTENT'">Découvrir →</ng-container>
                    <ng-container *ngIf="selectedType === 'EXERCICE'">S'entraîner →</ng-container>
                    <ng-container *ngIf="selectedType !== 'CONTENT' && selectedType !== 'EXERCICE'">Jouer →</ng-container>
                  </button>
                </div>
              </div>

            </div>

            <div class="empty-state" *ngIf="filteredActivities.length === 0">
              <p>Aucune activité disponible pour ce type</p>
              <button class="btn-primary" (click)="backToMenu()">Retour au menu</button>
            </div>
          </div>
        </ng-template>
      </div> <!-- Closes list-inner -->
    </div> <!-- Closes activities-list -->

      <!-- Player de l'activité sélectionnée -->
      <div class="activity-player" *ngIf="playingActivity">
        <div class="player-inner">

        <!-- QUIZ Player -->
        <div class="quiz-player" *ngIf="playingActivity.type === 'QUIZ'" style="position: relative;">

          <!-- Floating Back Button -->
          <button class="btn-back-floating" (click)="stopActivity()">
            <i class="fa-solid fa-arrow-left"></i> Quitter
          </button>

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

          <div class="result-overlay" *ngIf="quizFinished">
            <div class="result-card">
              <!-- Échec / Timeout -->
              <ng-container *ngIf="isTimeout || isQuizFailed()">
                <div class="result-icon">😔</div>
                <h2 class="result-title">{{ isTimeout ? 'Temps écoulé !' : 'Essaye encore !' }}</h2>
                <div class="result-score">{{ quizScore }} / {{ quizQuestions.length }}</div>
                <div class="points-earned" *ngIf="sessionPointsEarned !== null">
                  <span class="pts-session">+{{ sessionPointsEarned }} / {{ quizQuestions.length * 10 }} pts gagnés</span>
                  <span class="pts-total">Score total : {{ sessionTotalPoints }} pts</span>
                </div>
                <p class="result-message">
                  Vous n’avez pas atteint le score requis cette fois-ci, mais ne vous découragez pas ! Continuez à vous entraîner pour progresser.
                </p>
                <div class="result-actions">
                  <button class="btn-result-primary" (click)="goToNextStade()" *ngIf="!isLastStade()">
                    Passer au stade suivant ⏩
                  </button>
                  <button class="btn-result-secondary" (click)="stopActivity()">
                    Jouer à une autre activité 📚
                  </button>
                </div>
              </ng-container>

              <!-- Succès -->
              <ng-container *ngIf="!isTimeout && !isQuizFailed()">
                <div class="result-icon">🎉</div>
                <h2 class="result-title">Félicitations !</h2>
                <div class="result-score">{{ quizScore }} / {{ quizQuestions.length }}</div>
                <div class="points-earned" *ngIf="sessionPointsEarned !== null">
                  <span class="pts-session">+{{ sessionPointsEarned }} / {{ quizQuestions.length * 10 }} pts gagnés</span>
                  <span class="pts-total">Score total : {{ sessionTotalPoints }} pts</span>
                </div>
                <p class="result-message">{{ getScoreMessage() }}</p>
                <div class="result-actions">
                  <button class="btn-result-secondary" (click)="stopActivity()">
                    Jouer à une autre activité 📚
                  </button>
                </div>
              </ng-container>
            </div>
          </div>
        </div>

        <!-- GAME Player (Memory) -->
        <div class="game-player" *ngIf="playingActivity.type === 'GAME'">

          <!-- Game Header Premium -->
          <div class="game-header-premium" style="position: relative;">
            <div class="game-header-glow"></div>
            <!-- Floating Back Button -->
            <button class="btn-back-floating" (click)="stopActivity()">
              <i class="fa-solid fa-arrow-left"></i> Quitter
            </button>
            <div class="game-header-inner">
              <div class="game-category-badge">🎮 Jeu de Mémoire</div>
              <h2 class="game-main-title">{{ playingActivity.title }}</h2>
              <div class="game-header-stats">
                <div class="game-stat-pill" [class.danger]="timerRemaining < 10">
                  <span class="game-stat-icon">⏱️</span>
                  <div class="game-stat-info">
                    <span class="game-stat-value">{{ getFormattedTime() }}</span>
                    <span class="game-stat-label">Temps restant</span>
                  </div>
                </div>
                <div class="game-stat-divider"></div>
                <div class="game-stat-pill">
                  <span class="game-stat-icon">🎯</span>
                  <div class="game-stat-info">
                    <span class="game-stat-value">{{ gameMoves }}</span>
                    <span class="game-stat-label">Coups joués</span>
                  </div>
                </div>
                <div class="game-stat-divider"></div>
                <div class="game-stat-pill">
                  <span class="game-stat-icon">✅</span>
                  <div class="game-stat-info">
                    <span class="game-stat-value">{{ getMatchedPairs() }} / {{ memoryCards.length / 2 }}</span>
                    <span class="game-stat-label">Paires trouvées</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Progress bar -->
          <div class="game-progress-bar-wrap">
            <div class="game-progress-bar-fill" [style.width.%]="(getMatchedPairs() / (memoryCards.length / 2)) * 100"></div>
          </div>

          <!-- Memory Grid -->
          <div class="memory-grid" [class.grid-large]="memoryCards.length > 12">
            <div class="memory-card"
                 *ngFor="let card of memoryCards; let i = index"
                 [class.flipped]="card.flipped"
                 [class.matched]="card.matched"
                 (click)="flipCard(i)">
              <div class="card-inner">
                <div class="card-front">
                  <div class="card-front-icon">?</div>
                </div>
                <div class="card-back">
                  <span class="card-emoji">{{ card.emoji }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="result-overlay" *ngIf="gameFinished">
            <div class="result-card">
              <!-- Échec -->
              <ng-container *ngIf="isTimeout || !gameSuccess">
                <div class="result-icon">😔</div>
                <h2 class="result-title">{{ isTimeout ? 'Temps écoulé !' : 'Dommage !' }}</h2>
                <div class="result-score">{{ gameMoves }} coups</div>
                <div class="points-earned" *ngIf="sessionPointsEarned !== null">
                  <span class="pts-session">+{{ sessionPointsEarned }} / {{ (memoryCards.length / 2) * 10 }} pts gagnés</span>
                  <span class="pts-total">Score total : {{ sessionTotalPoints }} pts</span>
                </div>
                <p class="result-message">
                  Vous n'avez pas atteint le score requis cette fois-ci (max {{ (memoryCards.length / 2) * 3 }} coups), mais ne vous découragez pas ! Continuez à vous entraîner pour progresser.
                </p>
                <div class="result-actions">
                  <button class="btn-result-primary" (click)="goToNextStade()" *ngIf="!isLastStade()">
                    Passer au stade suivant ⏩
                  </button>
                  <button class="btn-result-secondary" (click)="stopActivity()">
                    Jouer à une autre activité 📚
                  </button>
                </div>
              </ng-container>

              <!-- Succès -->
              <ng-container *ngIf="!isTimeout && gameSuccess">
                <div class="result-icon">🎉</div>
                <h2 class="result-title">Bravo !</h2>
                <div class="result-score">{{ gameMoves }} coups</div>
                <div class="points-earned" *ngIf="sessionPointsEarned !== null">
                  <span class="pts-session">+{{ sessionPointsEarned }} / {{ (memoryCards.length / 2) * 10 }} pts gagnés</span>
                  <span class="pts-total">Score total : {{ sessionTotalPoints }} pts</span>
                </div>
                <p class="result-message">
                  Félicitations, vous avez trouvé toutes les paires avec un excellent score ! (Maximum autorisé : {{ (memoryCards.length / 2) * 3 }} coups)
                </p>
                <div class="result-actions">
                  <button class="btn-result-secondary" (click)="stopActivity()">
                    Jouer à une autre activité 📚
                  </button>
                </div>
              </ng-container>
            </div>
          </div>
        </div>

        <!-- CONTENT Player -->
        <div class="content-player" *ngIf="playingActivity.type === 'CONTENT'">
          <div class="content-view-container content-view-premium" style="position: relative;">
            <button class="btn-back-floating" (click)="stopActivity()">
              <i class="fa-solid fa-arrow-left"></i> Quitter
            </button>
            <!-- Header du contenu -->
            <div class="content-view-header content-header-premium">
              <div class="content-halo"></div>
              <div class="content-meta premium-meta">
                <span class="content-type-badge premium-badge" [class.video]="contentData.contentType === 'video'">
                  <i class="fa-solid" [class.fa-play-circle]="contentData.contentType === 'video'" [class.fa-file-alt]="contentData.contentType === 'article'"></i>
                  {{ contentData.contentType === 'video' ? 'Vidéo' : 'Article' }}
                </span>
                <span class="content-duration premium-duration"><i class="fa-regular fa-clock me-1"></i> {{ playingActivity.estimatedMinutes }} min de lecture</span>
              </div>
              <h1 class="content-view-title content-title-giant">{{ playingActivity.title }}</h1>
            </div>

            <!-- Lecteur Vidéo -->
            <div class="content-main-area" *ngIf="contentData.contentType === 'video'">
              <div class="video-wrapper video-wrapper-premium shadow-lg">
                <div class="video-glow"></div>
                <div class="video-container" *ngIf="safeVideoUrl">
                  <iframe
                    class="video-iframe"
                    [src]="safeVideoUrl"
                    title="Lecteur vidéo"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen>
                  </iframe>
                </div>
                <!-- Placeholder vidéo -->
                <div class="video-placeholder-premium" *ngIf="!safeVideoUrl">
                  <div class="placeholder-icon">⚠️</div>
                  <p>Lien vidéo non disponible ou incorrect</p>
                  <code class="url-hint">{{ contentData.videoUrl }}</code>
                </div>
              </div>
            </div>

            <!-- Affichage Article -->
            <div class="content-main-area" *ngIf="contentData.contentType === 'article'">
              <div class="article-wrapper">
                <div class="article-banner" *ngIf="contentData.imageUrl">
                  <img [src]="contentData.imageUrl" alt="Couverture" class="article-img-fluid" />
                  <div class="image-overlay"></div>
                </div>
                <!-- Placeholder image article -->
                <div class="article-banner-placeholder" *ngIf="!contentData.imageUrl">
                  <div class="placeholder-icon">📖</div>
                  <p>Lecture thématique</p>
                </div>
              </div>
            </div>

            <!-- Corps du texte / Description -->
            <div class="content-body-card content-body-premium">
              <div class="body-content">
                <h3 class="section-label premium-label"><i class="fa-solid fa-book-open text-purple me-2"></i> À propos de cette activité</h3>
                <p class="description-text premium-desc">{{ playingActivity.description }}</p>
              </div>
              
              <hr class="content-divider" *ngIf="!showAudioSession" />

              <!-- Language picker + audio trigger -->
              <div class="audio-trigger-zone" *ngIf="!showAudioSession && !audioSessionComplete" style="margin-top: 20px;">

                <!-- Language Toggle -->
                <div class="lang-toggle-wrap">
                  <button class="lang-btn" [class.active]="audioLanguage === 'fr'" (click)="audioLanguage = 'fr'">
                    🇫🇷 Français
                  </button>
                  <button class="lang-btn" [class.active]="audioLanguage === 'en'" (click)="audioLanguage = 'en'">
                    🇬🇧 English
                  </button>
                </div>
                <button class="btn-start-audio" id="btn-start-audio-session" (click)="startAudioSession()">
                  <span class="audio-btn-icon">🎧</span>
                  <span>{{ audioLanguage === 'en' ? 'Start audio exercise' : "Commencer l'exercice audio" }}</span>
                </button>
                <p class="audio-hint-text mt-2 mb-0">{{
                  audioLanguage === 'en'
                    ? 'A guided voice exercise to reinforce what you just watched'
                    : 'Un exercice vocal guidé pour renforcer ce que vous venez de voir'
                }}</p>
              </div>
              
              <div class="content-footer-actions mt-4" *ngIf="!showAudioSession">
                <button class="btn-outline-purple" (click)="stopActivity()">
                  Terminer sans l'exercice
                </button>
              </div>
            </div>

            <!-- ═══════════════════════════════════════════════════ -->
            <!-- AUDIO AI SESSION — appears below video when started -->
            <!-- ═══════════════════════════════════════════════════ -->

            <!-- Audio Session Module -->
            <div class="audio-session-module" *ngIf="showAudioSession" id="audio-session-module">

              <!-- Header -->
              <div class="asm-header">
                <div class="asm-header-left">
                  <div class="asm-brain-icon">🧠</div>
                  <div>
                    <h2 class="asm-title">Exercice Audio</h2>
                    <div class="asm-progress" *ngIf="audioTotalQuestions > 0">
                      Question {{ audioCurrentIndex + 1 }} / {{ audioTotalQuestions }}
                    </div>
                  </div>
                </div>
                <!-- Live State Badge -->
                <div class="asm-state-badge" [class]="'badge-' + audioState">
                  <span *ngIf="audioState === 'idle'">⏳ Préparation…</span>
                  <span *ngIf="audioState === 'speaking'">🤖 Assistant</span>
                  <span *ngIf="audioState === 'listening'">🎤 Votretour</span>
                  <span *ngIf="audioState === 'done'">✅ Terminé</span>
                </div>
              </div>

              <!-- ── CHAT CONVERSATION FEED ── -->
              <div class="asm-chat-feed" id="asm-chat-feed">

                <!-- Each chat bubble -->
                <ng-container *ngFor="let msg of chatHistory">
                  <!-- AI bubble -->
                  <div class="asm-bubble asm-bubble-ai" *ngIf="msg.speaker === 'ai'">
                    <div class="asm-avatar-ai">🧠</div>
                    <div class="asm-bubble-body">
                      <span class="asm-bubble-label">Assistant</span>
                      <p class="asm-bubble-text">{{ msg.text }}</p>
                    </div>
                  </div>
                  <!-- Patient bubble -->
                  <div class="asm-bubble asm-bubble-patient" *ngIf="msg.speaker === 'patient'">
                    <div class="asm-bubble-body">
                      <span class="asm-bubble-label">Vous</span>
                      <p class="asm-bubble-text">{{ msg.text }}</p>
                    </div>
                    <div class="asm-avatar-patient">👤</div>
                  </div>
                </ng-container>

                <!-- Live typing bubble: AI speaking -->
                <div class="asm-bubble asm-bubble-ai asm-bubble-live" *ngIf="audioState === 'speaking' && audioCurrentText">
                  <div class="asm-avatar-ai">🧠</div>
                  <div class="asm-bubble-body">
                    <span class="asm-bubble-label">Assistant</span>
                    <p class="asm-bubble-text">{{ audioCurrentText }}</p>
                    <div class="asm-typing-dots"><span></span><span></span><span></span></div>
                  </div>
                </div>

                <!-- Listening indicator -->
                <div class="asm-bubble asm-bubble-patient asm-bubble-listening" *ngIf="audioState === 'listening'">
                  <div class="asm-bubble-body">
                    <span class="asm-bubble-label">Votre réponse…</span>
                    <div class="asm-listen-content">
                      <div class="asm-mic-rings">
                        <div class="asm-mic-ring r1"></div>
                        <div class="asm-mic-ring r2"></div>
                        <div class="asm-mic-ring r3"></div>
                        <span class="asm-mic-emoji">🎤</span>
                      </div>
                      <!-- Countdown -->
                      <div class="asm-countdown-wrap" *ngIf="listenCountdown > 0">
                        <svg class="asm-countdown-svg" viewBox="0 0 44 44">
                          <circle class="asm-cd-track" cx="22" cy="22" r="18"/>
                          <circle class="asm-cd-fill" cx="22" cy="22" r="18"
                                  [style.stroke-dashoffset]="(1 - listenCountdown/30) * 113"/>
                        </svg>
                        <span class="asm-countdown-num">{{ listenCountdown }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="asm-avatar-patient">👤</div>
                </div>

                <!-- Idle -->
                <div class="asm-bubble asm-bubble-ai" *ngIf="audioState === 'idle'">
                  <div class="asm-avatar-ai">🧠</div>
                  <div class="asm-bubble-body">
                    <span class="asm-bubble-label">Assistant</span>
                    <div class="asm-typing-dots"><span></span><span></span><span></span></div>
                  </div>
                </div>

                <!-- Done: confetti card -->
                <div class="asm-done-card" *ngIf="audioState === 'done'">
                  <div class="asm-complete-icon">🎉</div>
                  <h3 class="asm-complete-title">Bravo !</h3>
                  <p class="asm-complete-msg">Vous avez terminé l'exercice avec succès.</p>
                  <div class="asm-final-summary" *ngIf="audioFinalSummary.length > 0">
                    <p *ngFor="let line of audioFinalSummary" class="asm-final-line">{{ line }}</p>
                  </div>
                  <button class="btn-finish-content" style="margin-top:24px" (click)="stopActivity()">
                    <span>Terminer la séance</span>
                    <i class="arrow-icon">→</i>
                  </button>
                </div>

              </div><!-- /asm-chat-feed -->

              <!-- Action Buttons (visible when not done) -->
              <div class="asm-actions" *ngIf="audioState !== 'done'">
                <button class="asm-btn asm-btn-speak" id="btn-audio-speak"
                        [disabled]="audioState === 'listening' || audioState === 'idle'"
                        (click)="onAudioSpeak()">
                  <span class="asm-btn-icon">🎤</span>
                  <span class="asm-btn-label">Parler</span>
                </button>

                <button class="asm-btn asm-btn-repeat" id="btn-audio-repeat"
                        [disabled]="audioState === 'idle' || !audioSessionId"
                        (click)="onAudioRepeat()">
                  <span class="asm-btn-icon">🔁</span>
                  <span class="asm-btn-label">Répéter</span>
                </button>

                <button class="asm-btn asm-btn-stop" id="btn-audio-stop"
                        (click)="onAudioStop()">
                  <span class="asm-btn-icon">⏹</span>
                  <span class="asm-btn-label">Arrêter</span>
                </button>
              </div>

              <!-- STT not supported warning -->
              <div class="asm-warning" *ngIf="!speechRecognitionSupported">
                ⚠️ Votre navigateur ne supporte pas la reconnaissance vocale. Utilisez Chrome pour une meilleure expérience.
              </div>

            </div>
          </div>
        </div>

        <!-- SCORE MODAL -->
        <div class="score-modal-overlay" *ngIf="showScoreModal" (click)="showScoreModal = false">
          <div class="score-modal-card" (click)="$event.stopPropagation()">
            <div class="score-modal-header">
              <div class="score-confetti">🎉</div>
              <h2 class="score-modal-title">{{ audioLanguage === 'en' ? 'Session Complete!' : 'Séance terminée !' }}</h2>
              <p class="score-modal-subtitle">{{ audioLanguage === 'en' ? 'Here are your results' : 'Voici vos résultats' }}</p>
            </div>
            <div class="score-rings-row">
              <div class="score-ring-wrap">
                <svg class="score-ring" viewBox="0 0 80 80">
                  <circle class="score-ring-track" cx="40" cy="40" r="32"/>
                  <circle class="score-ring-fill correct-fill" cx="40" cy="40" r="32"
                    [style.stroke-dasharray]="201"
                    [style.stroke-dashoffset]="201 - (audioScoreTotal > 0 ? (audioScoreCorrect / audioScoreTotal) * 201 : 0)"/>
                </svg>
                <div class="score-ring-center"><span class="score-ring-num correct-num">{{ audioScoreCorrect }}</span></div>
                <span class="score-ring-label correct-label">{{ audioLanguage === 'en' ? '✅ Correct' : '✅ Correctes' }}</span>
              </div>
              <div class="score-ring-wrap">
                <svg class="score-ring" viewBox="0 0 80 80">
                  <circle class="score-ring-track" cx="40" cy="40" r="32"/>
                  <circle class="score-ring-fill partial-fill" cx="40" cy="40" r="32"
                    [style.stroke-dasharray]="201"
                    [style.stroke-dashoffset]="201 - (audioScoreTotal > 0 ? (audioScorePartial / audioScoreTotal) * 201 : 0)"/>
                </svg>
                <div class="score-ring-center"><span class="score-ring-num partial-num">{{ audioScorePartial }}</span></div>
                <span class="score-ring-label partial-label">{{ audioLanguage === 'en' ? '🟡 Partial' : '🟡 Partielles' }}</span>
              </div>
              <div class="score-ring-wrap">
                <svg class="score-ring" viewBox="0 0 80 80">
                  <circle class="score-ring-track" cx="40" cy="40" r="32"/>
                  <circle class="score-ring-fill incorrect-fill" cx="40" cy="40" r="32"
                    [style.stroke-dasharray]="201"
                    [style.stroke-dashoffset]="201 - (audioScoreTotal > 0 ? (audioScoreIncorrect / audioScoreTotal) * 201 : 0)"/>
                </svg>
                <div class="score-ring-center"><span class="score-ring-num incorrect-num">{{ audioScoreIncorrect }}</span></div>
                <span class="score-ring-label incorrect-label">{{ audioLanguage === 'en' ? '❌ Incorrect' : '❌ Incorrectes' }}</span>
              </div>
            </div>
            <div class="score-total-bar">
              <div class="score-total-label">{{ audioLanguage === 'en' ? 'Total:' : 'Total :' }} <strong>{{ audioScoreTotal }}</strong> {{ audioLanguage === 'en' ? 'questions' : 'questions' }}</div>
              <div class="score-progress-track">
                <div class="score-progress-correct" [style.width.%]="audioScoreTotal > 0 ? (audioScoreCorrect / audioScoreTotal) * 100 : 0"></div>
                <div class="score-progress-partial"  [style.width.%]="audioScoreTotal > 0 ? (audioScorePartial  / audioScoreTotal) * 100 : 0"></div>
                <div class="score-progress-incorrect" [style.width.%]="audioScoreTotal > 0 ? (audioScoreIncorrect / audioScoreTotal) * 100 : 0"></div>
              </div>
            </div>
            <p class="score-encourage">
              <ng-container *ngIf="audioScoreCorrect === audioScoreTotal && audioScoreTotal > 0">{{ audioLanguage === 'en' ? '🌟 Perfect score! Outstanding work!' : '🌟 Score parfait ! Excellent travail !' }}</ng-container>
              <ng-container *ngIf="audioScoreCorrect < audioScoreTotal && audioScoreCorrect >= audioScoreTotal / 2">{{ audioLanguage === 'en' ? '👏 Great effort! Keep it up!' : '👏 Bel effort ! Continuez ainsi !' }}</ng-container>
              <ng-container *ngIf="audioScoreCorrect < audioScoreTotal / 2 || audioScoreTotal === 0">{{ audioLanguage === 'en' ? '💪 Good try! Practice makes perfect.' : '💪 Bon essai ! La pratique rend parfait.' }}</ng-container>
            </p>
            <button class="score-close-btn" (click)="showScoreModal = false; stopActivity()">
              {{ audioLanguage === 'en' ? 'Close & Exit' : 'Fermer & Quitter' }}
            </button>
          </div>
        </div>

        <!-- EXERCICE Player -->
        <div class="exercice-player" *ngIf="playingActivity.type === 'EXERCICE'">

          <!-- Header Card -->
          <div class="exercice-header-card" style="position: relative;">
            <div class="exercice-header-glow"></div>
            <!-- Floating Back Button -->
            <button class="btn-back-floating" (click)="stopActivity()">
              <i class="fa-solid fa-arrow-left"></i> Quitter
            </button>
            <div class="exercice-header-inner">
              <div class="exercice-category-badge">🧘 Exercice de relaxation</div>
              <h2 class="exercice-main-title">{{ playingActivity.title }}</h2>
              <div class="exercice-sub-info">
                <span class="exercice-meta-pill">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {{ playingActivity.estimatedMinutes }} min
                </span>
                <span class="exercice-meta-pill rep-pill">
                  🔄 {{ exerciceCurrentRep }} / {{ exerciceData.repetitions }} répétitions
                </span>
              </div>
            </div>
          </div>

          <!-- Step Card (active step) -->
          <div class="etape-card-premium" *ngIf="currentEtape && !exerciceFinished">

            <!-- Step number indicator -->
            <div class="etape-step-track">
              <div class="etape-step-num">Étape {{ currentEtape.num }}</div>
              <div class="etape-step-label">{{ exerciceData?.sousType || 'Exercice' }}</div>
            </div>

            <!-- Breathing circle with countdown -->
            <div class="etape-breath-wrap">
              <div class="breath-ring breath-ring-outer"></div>
              <div class="breath-ring breath-ring-mid"></div>
              <div class="breath-circle">
                <div class="breath-count">{{ exerciceCountdown }}</div>
                <div class="breath-unit">secondes</div>
              </div>
            </div>

            <!-- Instruction -->
            <div class="etape-consigne-box">
              <p class="etape-consigne-text">{{ currentEtape.consigne }}</p>
            </div>

            <!-- Progress Bar -->
            <div class="etape-progress-wrap">
              <div class="etape-progress-track">
                <div class="etape-progress-fill" [style.width.%]="getEtapeProgress()"></div>
              </div>
              <div class="etape-progress-pct">{{ getEtapeProgress().toFixed(0) }}%</div>
            </div>

          </div>

          <!-- Result Overlay -->
          <div class="result-overlay" *ngIf="exerciceFinished">
            <div class="result-card">
              <div class="result-icon">🧘</div>
              <h2 class="result-title">Exercice terminé !</h2>
              <p class="result-message">Excellent travail ! Cette séance de relaxation est terminée. Prenez un moment pour ressentir le calme.</p>
              <div class="result-actions">
                <button class="btn-result-secondary" (click)="stopActivity()">Choisir une autre activité 📚</button>
              </div>
            </div>
          </div>

        </div> <!-- Closes player-inner -->
      </div> <!-- Closes activity-player -->

    </div>
  `,
  styles: [`
    .container {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0;
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: #ffffff;
      min-height: 100vh;
    }

    .selection-menu, .activities-list, .activity-player {
      padding: 0 0 60px;
      width: 100%;
      margin: 0;
    }

    /* Inner containers for centered content if needed */
    .menu-inner, .list-inner, .player-inner {
      max-width: 1600px;
      margin: 0 auto;
      padding: 0 40px;
    }

    /* ═══ Hero Banner (EventFront Style) ═══ */
    .edu-hero {
      position: relative;
      background: linear-gradient(135deg, rgba(128,0,128,0.06) 0%, rgba(128,0,128,0.01) 100%) !important;
      border: 1px solid rgba(128,0,128,0.08);
      border-radius: 16px;
      padding: 45px 30px !important;
      margin-bottom: 30px;
      overflow: hidden;
      color: #3d0040;
      text-align: center;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(128,0,128,0.04);
    }
    
    .header-badge {
      display: inline-block;
      padding: 6px 14px;
      background: white;
      color: #3d0040;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      border-radius: 50px;
      border: 1px solid rgba(128,0,128,0.1);
      box-shadow: 0 4px 12px rgba(128,0,128,0.05);
      margin-bottom: 12px;
    }
    
    .edu-hero::before {
      content: '';
      position: absolute;
      top: -50px; left: -50px;
      width: 180px; height: 180px;
      background: #f5e6f5;
      filter: blur(45px);
      border-radius: 50%;
      opacity: 0.6;
      z-index: 0;
    }

    .edu-hero::after {
      content: '';
      position: absolute;
      bottom: -40px; right: 8%;
      width: 150px; height: 150px;
      background: #e8c8e8;
      filter: blur(40px);
      border-radius: 50%;
      opacity: 0.4;
      z-index: 0;
    }

    .edu-hero-glow { display: none; } /* Replaced by ::before/::after */

    .edu-hero-content { position: relative; z-index: 1; }
    .edu-hero-icon { font-size: 56px; margin-bottom: 15px; display: block; }
    .edu-hero-title { 
      font-family: 'Fraunces', serif;
      font-size: 3.2rem; 
      font-weight: 800; 
      margin: 0; 
      line-height: 1.1;
      letter-spacing: -0.02em;
      background: linear-gradient(to right, #3d0040, #800080);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .edu-hero-sub { 
      font-size: 1.1rem; 
      color: #6b3e6b; 
      margin: 8px 0 25px; 
      max-width: 600px;
      line-height: 1.5;
      margin-left: auto;
      margin-right: auto;
    }

    /* ═══ Stats Bar (EventFront Style) ═══ */
    .stats-bar {
      display: inline-flex;
      align-items: center;
      gap: 0;
      background: white;
      border: 1.5px solid #e0c8e0;
      border-radius: 50px;
      padding: 6px 6px;
      margin-top: 5px;
      box-shadow: 0 2px 16px rgba(128, 0, 128, 0.08);
      position: relative;
      z-index: 1;
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 5px 22px;
    }

    .stat-icon {
      width: 32px; height: 32px;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      font-size: 14px;
    }
    .stat-icon.upcoming { background: #f5e6f5; color: #800080; }
    .stat-icon.total    { background: #fff9db; color: #92400e; }

    .stat-info { display: flex; flex-direction: column; text-align: left; }
    .stat-number {
      font-family: 'Fraunces', serif;
      font-size: 1.15rem;
      font-weight: 700;
      color: #3d0040;
      line-height: 1;
    }
    .stat-label {
      font-size: .7rem;
      color: #6b3e6b;
      font-weight: 500;
      margin-top: 2px;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .stat-divider { width: 1px; height: 28px; background: #e0c8e0; }

    .list-hero-cadre { margin-bottom: 25px !important; }
    .btn-back-floating {
      position: absolute; top: 20px; left: 20px;
      background: white; border: 1px solid rgba(128,0,128,0.1);
      padding: 8px 16px; border-radius: 50px; color: #800080;
      font-weight: 700; font-size: 0.8rem; cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05); z-index: 10;
      transition: all 0.2s ease;
      display: flex; align-items: center; gap: 6px;
    }
    .btn-back-floating:hover { transform: translateX(-3px); border-color: #800080; background: #faf8ff; }

    .btn-reset {
      background: #ffffff; color: #800080; border: 1px solid rgba(128,0,128,0.1);
      padding: 10px 22px; border-radius: 50px; font-weight: 700;
      cursor: pointer; transition: all 0.2s ease;
      margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      display: inline-block;
    }
    .btn-reset:hover { background: #800080; color: white; transform: translateY(-1px); }

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
    .selection-menu { text-align: center; padding: 0 0 40px; }

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

    /* Quiz player — space for the floating back button */
    .quiz-player {
      padding-top: 60px;
    }

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
    .result-icon { font-size: 80px; margin-bottom: 15px; }
    .result-title { font-family: 'Fraunces', serif; font-size: 36px; font-weight: 800; margin-bottom: 10px; }
    .fail-title   { color: #800080; }
    .success-title { color: #059669; }
    .score { font-family: 'Fraunces', serif; font-size: 72px; font-weight: 800; margin: 20px 0; }
    .score-success { 
      background: linear-gradient(to bottom, #800080, #5c0057);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .score-fail    { color: #ef4444; }
    .score-message { font-size: 1.1rem; color: #6b3e6b; margin-bottom: 30px; line-height: 1.6; }
    .result-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 8px; }

    /* ═══════════════════════════════════════════════════════════ */
    /* GAME PLAYER — Premium Memory Design                         */
    /* ═══════════════════════════════════════════════════════════ */

    .game-player {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      padding: 0 20px 60px;
      max-width: 860px;
      margin: 0 auto;
      width: 100%;
    }

    /* Game Header Premium */
    .game-header-premium {
      position: relative;
      width: 100%;
      background: linear-gradient(135deg, rgba(128,0,128,0.07) 0%, rgba(92,0,87,0.04) 100%);
      border: 1px solid rgba(128,0,128,0.12);
      border-radius: 24px;
      padding: 28px 32px;
      text-align: center;
      overflow: hidden;
      box-shadow: 0 6px 28px rgba(128,0,128,0.08);
    }
    .game-header-glow {
      position: absolute;
      top: -50px; right: -50px;
      width: 200px; height: 200px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(128,0,128,0.15) 0%, transparent 70%);
      pointer-events: none;
    }
    .game-header-inner { position: relative; z-index: 1; }
    .game-category-badge {
      display: inline-block;
      background: white;
      color: #4d004d;
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 5px 18px;
      border-radius: 50px;
      border: 1px solid rgba(128,0,128,0.14);
      margin-bottom: 10px;
      box-shadow: 0 2px 8px rgba(128,0,128,0.06);
    }
    .game-main-title {
      font-family: 'Fraunces', serif;
      font-size: 1.8rem;
      font-weight: 800;
      background: linear-gradient(to right, #3d0040, #800080);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0 0 20px;
      line-height: 1.15;
    }
    .game-header-stats {
      display: inline-flex;
      align-items: center;
      background: white;
      border: 1.5px solid #e0c8e0;
      border-radius: 50px;
      padding: 6px 6px;
      box-shadow: 0 2px 16px rgba(128,0,128,0.08);
      gap: 0;
    }
    .game-stat-pill {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 20px;
      transition: background 0.2s;
    }
    .game-stat-pill.danger {
      background: #fee2e2;
      border-radius: 40px;
    }
    .game-stat-pill.danger .game-stat-value {
      color: #ef4444;
      animation: pulse-red-alert 0.8s infinite;
    }
    .game-stat-icon { font-size: 18px; }
    .game-stat-info { display: flex; flex-direction: column; text-align: left; }
    .game-stat-value {
      font-family: 'Fraunces', serif;
      font-size: 1.1rem;
      font-weight: 700;
      color: #3d0040;
      line-height: 1;
    }
    .game-stat-label {
      font-size: 0.65rem;
      font-weight: 600;
      color: #6b3e6b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-top: 2px;
    }
    .game-stat-divider { width: 1px; height: 28px; background: #e0c8e0; }

    /* Progress Bar */
    .game-progress-bar-wrap {
      width: 100%;
      height: 6px;
      background: #f0e0f0;
      border-radius: 50px;
      overflow: hidden;
    }
    .game-progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #c084c8, #800080);
      border-radius: 50px;
      transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 0 8px rgba(128, 0, 128, 0.3);
    }

    /* Memory Grid */
    .memory-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      max-width: 720px;
      width: 100%;
      margin: 0 auto;
    }
    .memory-grid.grid-large {
      grid-template-columns: repeat(5, 1fr);
      max-width: 860px;
    }

    /* Memory Card — 3D Flip */
    .memory-card {
      aspect-ratio: 1;
      cursor: pointer;
      perspective: 900px;
      border-radius: 18px;
      transition: transform 0.2s;
    }
    .memory-card:hover:not(.matched) { transform: scale(1.06); }

    .card-inner {
      position: relative;
      width: 100%; height: 100%;
      transform-style: preserve-3d;
      transition: transform 0.5s cubic-bezier(0.4, 0.2, 0.2, 1);
      border-radius: 18px;
    }
    .memory-card.flipped .card-inner,
    .memory-card.matched .card-inner {
      transform: rotateY(180deg);
    }

    .card-front,
    .card-back {
      position: absolute;
      width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      border-radius: 18px;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }
    .card-front {
      background: linear-gradient(135deg, #800080 0%, #5c0057 60%, #3d0040 100%);
      box-shadow: 0 6px 22px rgba(128,0,128,0.35), inset 0 1px 0 rgba(255,255,255,0.15);
    }
    .card-front-icon {
      font-size: 36px;
      font-weight: 900;
      color: rgba(255,255,255,0.5);
      text-shadow: 0 2px 8px rgba(0,0,0,0.2);
      letter-spacing: -1px;
    }
    .card-back {
      background: white;
      border: 2.5px solid #e9d5ff;
      transform: rotateY(180deg);
      box-shadow: 0 4px 16px rgba(128,0,128,0.12);
    }
    .memory-card.matched .card-back {
      background: linear-gradient(135deg, #f0fdf4, #d1fae5);
      border-color: #10b981;
      box-shadow: 0 4px 16px rgba(16,185,129,0.25);
    }
    .card-emoji {
      font-size: 42px;
      line-height: 1;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
    }
    .memory-card.matched {
      animation: card-match-pulse 0.5s ease;
    }
    @keyframes card-match-pulse {
      0%   { transform: scale(1); }
      40%  { transform: scale(1.12); }
      100% { transform: scale(1); }
    }

    /* ═══ Content Player Premium ═══ */
    .content-view-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 0 20px;
      animation: slideUp 0.5s ease-out;
    }

    .content-view-header {
      text-align: center;
      margin-bottom: 35px;
    }

    .content-meta {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 15px;
      margin-bottom: 15px;
    }

    .content-type-badge {
      background: #fdf2f2;
      color: #991b1b;
      padding: 5px 14px;
      border-radius: 50px;
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      border: 1px solid rgba(153, 27, 27, 0.1);
    }
    .content-type-badge.video {
      background: #fffbeb;
      color: #92400e;
      border-color: rgba(146, 64, 14, 0.1);
    }

    .content-duration {
      font-size: 0.85rem;
      color: #7f8ea3;
      font-weight: 600;
    }

    .content-view-title {
      font-family: 'Fraunces', serif;
      font-size: 2.8rem;
      font-weight: 800;
      color: #3d0040;
      margin: 0;
      line-height: 1.2;
    }

    .content-main-area {
      margin-bottom: 30px;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
    }

    .video-wrapper {
      background: #000;
      aspect-ratio: 16/9;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .video-container {
      width: 100%;
      height: 100%;
    }

    .video-iframe {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    }

    .video-placeholder-premium {
      text-align: center;
      color: #a0aec0;
      padding: 40px;
    }

    .article-banner {
      position: relative;
      width: 100%;
      max-height: 450px;
      overflow: hidden;
    }

    .article-img-fluid {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .article-banner-placeholder {
      background: linear-gradient(135deg, #f3e8ff, #e9d5ff);
      height: 300px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #800080;
    }

    .placeholder-icon {
      font-size: 60px;
      margin-bottom: 15px;
      opacity: 0.8;
    }

    .content-body-card {
      background: white;
      border-radius: 24px;
      padding: 40px;
      border: 1px solid rgba(128,0,128,0.08);
      box-shadow: 0 10px 30px rgba(128,0,128,0.03);
    }

    .section-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #800080;
      font-weight: 800;
      margin-bottom: 15px;
    }

    .description-text {
      font-size: 1.2rem;
      color: #2d3748;
      line-height: 1.7;
      margin-bottom: 25px;
    }

    .content-divider {
      border: 0;
      height: 1px;
      background: linear-gradient(to right, #f3e8ff, transparent);
      margin: 25px 0;
    }

    .content-details {
      font-size: 1.05rem;
      color: #4a5568;
      line-height: 1.6;
    }

    .content-footer-actions {
      margin-top: 40px;
      display: flex;
      justify-content: center;
    }

    .btn-finish-content {
      background: linear-gradient(135deg, #800080, #5c0057);
      color: white;
      border: none;
      padding: 18px 40px;
      border-radius: 50px;
      font-weight: 700;
      font-size: 1.1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 15px;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      box-shadow: 0 10px 25px rgba(128, 0, 128, 0.3);
    }

    .btn-finish-content:hover {
      transform: translateY(-3px) scale(1.02);
      box-shadow: 0 15px 35px rgba(128, 0, 128, 0.4);
    }

    .arrow-icon {
      font-style: normal;
      transition: transform 0.3s ease;
    }

    .btn-finish-content:hover .arrow-icon {
      transform: translateX(5px);
    }

    .url-hint {
      display: block;
      margin-top: 10px;
      font-size: 0.8rem;
      background: #2d3748;
      color: #a0aec0;
      padding: 5px 12px;
      border-radius: 6px;
    }

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
      background: #f5f0f5; height: 16px;
      border-radius: 50px; overflow: hidden;
      border: 1px solid rgba(128,0,128,0.1);
      box-shadow: inset 0 2px 4px rgba(128,0,128,0.05);
    }
    .progress { 
      background: linear-gradient(90deg, #b07ab0, #800080); 
      height: 100%; 
      transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 0 12px rgba(128, 0, 128, 0.2);
    }

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
      flex-direction: row;
      gap: 20px;
      align-items: flex-start;
      width: 100%;
    }

    .stage-section {
      flex: 1;
      min-width: 0;
      border: 2px solid #f0e0f0;
      border-radius: 18px;
      padding: 20px;
      background: white;
      transition: all 0.3s;
      display: flex;
      flex-direction: column;
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
      flex-direction: column;
      gap: 12px;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px dashed #e0c8e0;
    }

    .stage-title-row {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      text-align: center;
      width: 100%;
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

    .spacer { flex: 1; }

    .btn-reset {
      position: absolute;
      bottom: -10px;
      right: 20px;
      background: white;
      color: #800080;
      border: 1px solid rgba(128,0,128,0.1);
      padding: 8px 16px;
      border-radius: 50px;
      font-weight: 700;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      z-index: 10;
    }
    .btn-reset:hover {
      background: #faf8ff;
      border-color: #800080;
      transform: translateY(-2px);
      box-shadow: 0 6px 15px rgba(128, 0, 128, 0.1);
    }

    /* ═══════════════════════════════════════════════════════════ */
    /* EXERCICE PLAYER — Premium Design                            */
    /* ═══════════════════════════════════════════════════════════ */

    .exercice-player {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 28px;
      padding: 0 20px 60px;
      max-width: 700px;
      margin: 0 auto;
    }

    /* Header card */
    .exercice-header-card {
      position: relative;
      width: 100%;
      background: linear-gradient(135deg, rgba(128,0,128,0.07) 0%, rgba(128,0,128,0.01) 100%);
      border: 1px solid rgba(128,0,128,0.1);
      border-radius: 20px;
      padding: 32px 28px;
      text-align: center;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(128,0,128,0.06);
    }
    .exercice-header-glow {
      position: absolute;
      top: -40px; right: -40px;
      width: 160px; height: 160px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(128,0,128,0.12) 0%, transparent 70%);
      pointer-events: none;
    }
    .exercice-header-inner { position: relative; z-index: 1; }
    .exercice-category-badge {
      display: inline-block;
      background: white;
      color: #4d004d;
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 5px 16px;
      border-radius: 50px;
      border: 1px solid rgba(128,0,128,0.12);
      margin-bottom: 12px;
    }
    .exercice-main-title {
      font-family: 'Fraunces', serif;
      font-size: 1.9rem;
      font-weight: 800;
      background: linear-gradient(to right, #3d0040, #800080);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0 0 16px;
      line-height: 1.15;
    }
    .exercice-sub-info {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .exercice-meta-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: white;
      border: 1px solid rgba(128,0,128,0.14);
      color: #6b3e6b;
      font-size: 0.8rem;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 50px;
      box-shadow: 0 2px 8px rgba(128,0,128,0.06);
    }
    .exercice-meta-pill svg { width: 13px; height: 13px; }
    .rep-pill { background: #fdf5fd; color: #800080; border-color: #e8c8e8; }

    /* Step Card */
    .etape-card-premium {
      width: 100%;
      background: white;
      border: 1px solid rgba(128,0,128,0.1);
      border-radius: 24px;
      padding: 36px 28px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      box-shadow: 0 8px 32px rgba(128,0,128,0.1);
      animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    /* Step number track */
    .etape-step-track {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    .etape-step-num {
      background: linear-gradient(135deg, #800080, #5c0057);
      color: white;
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 5px 14px;
      border-radius: 50px;
      box-shadow: 0 4px 12px rgba(128,0,128,0.28);
    }
    .etape-step-label {
      color: #b07ab0;
      font-size: 0.8rem;
      font-weight: 600;
    }

    /* Breathing circle */
    .etape-breath-wrap {
      position: relative;
      width: 180px;
      height: 180px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .breath-ring {
      position: absolute;
      border-radius: 50%;
      border: 2px solid rgba(128,0,128,0.18);
    }
    .breath-ring-outer {
      width: 180px; height: 180px;
      animation: breath-pulse 4s ease-in-out infinite;
    }
    .breath-ring-mid {
      width: 150px; height: 150px;
      border-color: rgba(128,0,128,0.28);
      animation: breath-pulse 4s ease-in-out infinite 0.5s;
    }
    @keyframes breath-pulse {
      0%, 100% { transform: scale(1); opacity: 0.7; }
      50% { transform: scale(1.08); opacity: 1; }
    }
    .breath-circle {
      width: 120px; height: 120px;
      border-radius: 50%;
      background: linear-gradient(135deg, #f5e6f5 0%, white 100%);
      border: 3px solid rgba(128,0,128,0.25);
      box-shadow: 0 8px 24px rgba(128,0,128,0.18), inset 0 2px 8px rgba(255,255,255,0.8);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      z-index: 1;
    }
    .breath-count {
      font-family: 'Fraunces', serif;
      font-size: 2.6rem;
      font-weight: 800;
      color: #800080;
      line-height: 1;
    }
    .breath-unit {
      font-size: 0.62rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #b07ab0;
    }

    /* Instruction box */
    .etape-consigne-box {
      width: 100%;
      background: linear-gradient(135deg, #fdf5fd 0%, #f3e8f3 100%);
      border: 1px solid rgba(128,0,128,0.12);
      border-radius: 16px;
      padding: 20px 24px;
      text-align: center;
    }
    .etape-consigne-text {
      font-size: 1.15rem;
      font-weight: 700;
      color: #3d0040;
      margin: 0;
      line-height: 1.5;
    }

    /* Progress Bar */
    .etape-progress-wrap {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .etape-progress-track {
      flex: 1;
      height: 8px;
      background: #f5e6f5;
      border-radius: 50px;
      overflow: hidden;
    }
    .etape-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #800080, #c026d3);
      border-radius: 50px;
      transition: width 0.5s ease;
    }
    .etape-progress-pct {
      font-size: 0.75rem;
      font-weight: 800;
      color: #800080;
      min-width: 36px;
      text-align: right;
    }

    /* ═══ Result Overlay (Modal) ═══ */
    .result-overlay {
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.3s ease-out;
    }

    .result-card {
      background: white;
      border-radius: 30px;
      padding: 50px 40px;
      max-width: 500px;
      width: 90%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      position: relative;
      border: 1px solid rgba(128, 0, 128, 0.1);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from { transform: translateY(30px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .result-icon {
      font-size: 80px;
      margin-bottom: 20px;
      display: block;
    }

    .result-title {
      font-size: 32px;
      font-weight: 800;
      margin-bottom: 12px;
      color: #3d0040;
    }

    .result-score {
      font-family: 'Fraunces', serif;
      font-size: 4rem;
      font-weight: 900;
      background: linear-gradient(to bottom, #800080, #5c0057);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 20px 0 5px;
    }

    .points-earned {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    .pts-session {
      background: #fdf2f8;
      color: #9d174d;
      padding: 6px 14px;
      border-radius: 20px;
      font-weight: 800;
      font-size: 1.1rem;
      border: 1px solid #fbcfe8;
    }

    .pts-total {
      background: #f0fdf4;
      color: #166534;
      padding: 6px 14px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 1rem;
      border: 1px solid #bbf7d0;
    }

    .result-message {
      font-size: 18px;
      color: #64748b;
      margin-bottom: 30px;
      line-height: 1.5;
    }

    .result-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .btn-result-primary {
      background: linear-gradient(135deg, #800080, #5c0057);
      color: white;
      border: none;
      padding: 16px 30px;
      border-radius: 15px;
      font-weight: 700;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 10px 20px rgba(128, 0, 128, 0.2);
    }

    .btn-result-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 15px 25px rgba(128, 0, 128, 0.3);
    }

    .btn-result-secondary {
      background: #f3e8ff;
      color: #800080;
      border: none;
      padding: 14px 30px;
      border-radius: 15px;
      font-weight: 700;
      font-size: 15px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-result-secondary:hover {
      background: #e9d5ff;
    }

    /* ═══════════════════════════════════════════════════════════ */
    /* AUDIO AI SESSION STYLES — CHAT UI                           */
    /* ═══════════════════════════════════════════════════════════ */

    /* Trigger zone */
    .audio-trigger-zone {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 36px 0 20px;
      gap: 10px;
    }

    .btn-start-audio {
      display: flex;
      align-items: center;
      gap: 14px;
      background: linear-gradient(135deg, #800080, #5c0057);
      color: white;
      border: none;
      padding: 22px 48px;
      border-radius: 60px;
      font-size: 1.25rem;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 12px 32px rgba(128,0,128,0.35);
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      animation: audio-btn-pulse 2.5s ease-in-out infinite;
    }
    .btn-start-audio:hover {
      transform: translateY(-4px) scale(1.04);
      box-shadow: 0 20px 40px rgba(128,0,128,0.45);
      animation: none;
    }
    @keyframes audio-btn-pulse {
      0%, 100% { box-shadow: 0 12px 32px rgba(128,0,128,0.35); }
      50%       { box-shadow: 0 12px 48px rgba(128,0,128,0.6); }
    }
    .audio-btn-icon { font-size: 1.6rem; }
    .audio-hint-text {
      font-size: 0.88rem;
      color: #7f6e7f;
      font-style: italic;
      text-align: center;
    }

    /* Language toggle */
    .lang-toggle-wrap {
      display: flex;
      gap: 10px;
      justify-content: center;
      margin-bottom: 20px;
    }
    .lang-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 22px;
      border-radius: 50px;
      border: 2px solid rgba(128,0,128,0.2);
      background: white;
      color: #6b3e6b;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.25s ease;
    }
    .lang-btn:hover {
      border-color: #800080;
      background: rgba(128,0,128,0.04);
    }
    .lang-btn.active {
      background: linear-gradient(135deg, #3d0040, #800080);
      color: white;
      border-color: #800080;
      box-shadow: 0 6px 20px rgba(128,0,128,0.3);
    }

    /* ── Score Modal ── */
    .score-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(30, 0, 40, 0.62);
      backdrop-filter: blur(6px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.3s ease;
    }
    .score-modal-card {
      background: white;
      border-radius: 28px;
      padding: 36px 32px 28px;
      width: min(90vw, 480px);
      box-shadow: 0 24px 64px rgba(128,0,128,0.22);
      animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      text-align: center;
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.7); }
      to   { opacity: 1; transform: scale(1); }
    }
    .score-modal-header { margin-bottom: 24px; }
    .score-confetti { font-size: 3rem; animation: bounce 0.8s ease infinite alternate; }
    @keyframes bounce {
      from { transform: translateY(0); }
      to   { transform: translateY(-10px); }
    }
    .score-modal-title {
      font-family: 'Fraunces', serif;
      font-size: 1.7rem;
      font-weight: 800;
      background: linear-gradient(135deg, #800080, #3d0040);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 8px 0 4px;
    }
    .score-modal-subtitle { color: #7f6e7f; font-size: 0.95rem; margin: 0; }

    /* Rings row */
    .score-rings-row {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin: 20px 0;
    }
    .score-ring-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      position: relative;
    }
    .score-ring {
      width: 80px; height: 80px;
      transform: rotate(-90deg);
    }
    .score-ring-track {
      fill: none;
      stroke: #f0e8f0;
      stroke-width: 8;
    }
    .score-ring-fill {
      fill: none;
      stroke-width: 8;
      stroke-linecap: round;
      transition: stroke-dashoffset 1s ease;
    }
    .correct-fill   { stroke: #22c55e; }
    .partial-fill   { stroke: #f59e0b; }
    .incorrect-fill { stroke: #ef4444; }
    .score-ring-center {
      position: absolute;
      top: 0; left: 0;
      width: 80px; height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .score-ring-num {
      font-size: 1.5rem;
      font-weight: 900;
      font-family: 'Fraunces', serif;
    }
    .correct-num   { color: #16a34a; }
    .partial-num   { color: #d97706; }
    .incorrect-num { color: #dc2626; }
    .score-ring-label { font-size: 0.78rem; font-weight: 700; }
    .correct-label   { color: #16a34a; }
    .partial-label   { color: #d97706; }
    .incorrect-label { color: #dc2626; }

    /* Progress bar */
    .score-total-bar { margin: 16px 0 12px; }
    .score-total-label {
      font-size: 0.9rem;
      color: #5a3e6b;
      margin-bottom: 8px;
    }
    .score-progress-track {
      display: flex;
      height: 12px;
      border-radius: 999px;
      overflow: hidden;
      background: #f0e8f0;
    }
    .score-progress-correct  { background: #22c55e; transition: width 1s ease; }
    .score-progress-partial  { background: #f59e0b; transition: width 1s ease 0.2s; }
    .score-progress-incorrect{ background: #ef4444; transition: width 1s ease 0.4s; }

    /* Encouragement */
    .score-encourage {
      font-size: 1rem;
      font-weight: 700;
      color: #3d0040;
      margin: 14px 0 20px;
      min-height: 1.5em;
    }

    /* Close button */
    .score-close-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 13px 36px;
      border-radius: 50px;
      border: none;
      background: linear-gradient(135deg, #800080, #3d0040);
      color: white;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(128,0,128,0.3);
      transition: all 0.25s ease;
    }
    .score-close-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 32px rgba(128,0,128,0.45);
    }

    /* ── Module container ── */
    .audio-session-module {
      background: #faf6fb;
      border: 1.5px solid rgba(128,0,128,0.12);
      border-radius: 28px;
      overflow: hidden;
      margin-top: 32px;
      box-shadow: 0 12px 40px rgba(128,0,128,0.07);
      animation: slideUp 0.5s ease-out;
    }

    /* ── Header ── */
    .asm-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: linear-gradient(135deg, #800080, #5c0057);
      padding: 18px 24px;
    }
    .asm-header-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .asm-brain-icon { font-size: 2.2rem; }
    .asm-title {
      font-family: 'Fraunces', serif;
      font-size: 1.45rem;
      font-weight: 800;
      color: white;
      margin: 0;
      line-height: 1.1;
    }
    .asm-progress {
      font-size: 0.78rem;
      color: rgba(255,255,255,0.75);
      font-weight: 600;
      margin-top: 3px;
    }

    /* Live state badge */
    .asm-state-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 18px;
      border-radius: 50px;
      font-size: 0.82rem;
      font-weight: 700;
      color: white;
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.25);
      backdrop-filter: blur(4px);
      transition: background 0.4s ease;
    }
    .badge-listening {
      background: rgba(0,180,90,0.25);
      border-color: rgba(0,220,110,0.5);
      animation: badge-glow 1.4s ease-in-out infinite;
    }
    @keyframes badge-glow {
      0%,100% { box-shadow: 0 0 0 0 rgba(0,220,110,0); }
      50%      { box-shadow: 0 0 0 6px rgba(0,220,110,0.2); }
    }

    /* ── Chat Feed ── */
    .asm-chat-feed {
      height: 380px;
      overflow-y: auto;
      padding: 24px 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      scroll-behavior: smooth;
    }
    .asm-chat-feed::-webkit-scrollbar { width: 4px; }
    .asm-chat-feed::-webkit-scrollbar-track { background: transparent; }
    .asm-chat-feed::-webkit-scrollbar-thumb { background: rgba(128,0,128,0.18); border-radius: 8px; }

    /* ── Bubbles ── */
    .asm-bubble {
      display: flex;
      align-items: flex-end;
      gap: 10px;
      max-width: 82%;
      animation: bubble-in 0.3s cubic-bezier(0.22, 1, 0.36, 1);
    }
    @keyframes bubble-in {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .asm-bubble-ai { align-self: flex-start; }
    .asm-bubble-patient { align-self: flex-end; flex-direction: row-reverse; }

    .asm-avatar-ai, .asm-avatar-patient {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      flex-shrink: 0;
    }
    .asm-avatar-ai {
      background: linear-gradient(135deg, #800080, #5c0057);
    }
    .asm-avatar-patient {
      background: linear-gradient(135deg, #e8c8e8, #d4a0d4);
    }

    .asm-bubble-body {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .asm-bubble-label {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94658a;
      padding: 0 6px;
    }
    .asm-bubble-ai .asm-bubble-label { color: #800080; }
    .asm-bubble-patient .asm-bubble-label { color: #6b3e6b; text-align: right; }

    .asm-bubble-text {
      margin: 0;
      padding: 14px 18px;
      border-radius: 18px;
      font-size: 1.05rem;
      line-height: 1.6;
      font-weight: 500;
    }
    .asm-bubble-ai .asm-bubble-text {
      background: white;
      color: #3d0040;
      border: 1px solid rgba(128,0,128,0.12);
      border-bottom-left-radius: 4px;
      box-shadow: 0 2px 12px rgba(128,0,128,0.07);
    }
    .asm-bubble-patient .asm-bubble-text {
      background: linear-gradient(135deg, #800080, #5c0057);
      color: white;
      border-bottom-right-radius: 4px;
      box-shadow: 0 2px 12px rgba(128,0,128,0.25);
    }

    /* Live AI bubble glow */
    .asm-bubble-live .asm-bubble-text {
      border-color: rgba(128,0,128,0.3);
      box-shadow: 0 0 0 3px rgba(128,0,128,0.1);
    }

    /* Typing dots (AI speaking indicator) */
    .asm-typing-dots {
      display: flex;
      gap: 5px;
      padding: 6px 4px 2px;
    }
    .asm-typing-dots span {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #c084c8;
      animation: typing-dot 1.2s ease-in-out infinite;
    }
    .asm-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .asm-typing-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typing-dot {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
      40%           { transform: scale(1);   opacity: 1; }
    }

    /* ── Listening bubble ── */
    .asm-bubble-listening .asm-bubble-text { display: none; }
    .asm-bubble-listening .asm-bubble-body {
      background: white;
      border: 1.5px solid rgba(0,200,100,0.3);
      border-radius: 18px;
      border-bottom-right-radius: 4px;
      padding: 14px 20px;
      box-shadow: 0 0 0 4px rgba(0,200,100,0.08);
      animation: listen-glow 1.6s ease-in-out infinite;
    }
    @keyframes listen-glow {
      0%,100% { box-shadow: 0 0 0 4px rgba(0,200,100,0.05); }
      50%     { box-shadow: 0 0 0 8px rgba(0,200,100,0.12); }
    }
    .asm-bubble-listening .asm-bubble-label { color: #00a85a; }

    .asm-listen-content {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-top: 8px;
    }

    /* Mic rings */
    .asm-mic-rings {
      position: relative;
      width: 52px;
      height: 52px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .asm-mic-ring {
      position: absolute;
      border-radius: 50%;
      border: 2px solid rgba(0,200,100,0.4);
      animation: mic-ring-expand 2s ease-out infinite;
    }
    .r1 { width: 52px; height: 52px; animation-delay: 0s; }
    .r2 { width: 40px; height: 40px; animation-delay: 0.4s; }
    .r3 { width: 28px; height: 28px; animation-delay: 0.8s; }
    @keyframes mic-ring-expand {
      0%   { transform: scale(0.6); opacity: 1; }
      100% { transform: scale(1.4); opacity: 0; }
    }
    .asm-mic-emoji {
      font-size: 1.5rem;
      position: relative;
      z-index: 2;
    }

    /* Countdown circle */
    .asm-countdown-wrap {
      position: relative;
      width: 52px;
      height: 52px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .asm-countdown-svg {
      position: absolute;
      width: 52px;
      height: 52px;
      transform: rotate(-90deg);
    }
    .asm-cd-track {
      fill: none;
      stroke: rgba(128,0,128,0.12);
      stroke-width: 3.5;
    }
    .asm-cd-fill {
      fill: none;
      stroke: #800080;
      stroke-width: 3.5;
      stroke-linecap: round;
      stroke-dasharray: 113.1;
      stroke-dashoffset: 0;
      transition: stroke-dashoffset 1s linear;
    }
    .asm-countdown-num {
      position: relative;
      z-index: 2;
      font-family: 'Fraunces', serif;
      font-size: 1.5rem;
      font-weight: 900;
      color: #800080;
    }

    /* ── Done card ── */
    .asm-done-card {
      text-align: center;
      padding: 24px 16px;
      animation: bubble-in 0.4s ease;
    }
    .asm-complete-icon { font-size: 4rem; margin-bottom: 8px; animation: asm-bounce 0.6s ease; }
    @keyframes asm-bounce {
      0%   { transform: scale(0.4); opacity: 0; }
      70%  { transform: scale(1.1); }
      100% { transform: scale(1);   opacity: 1; }
    }
    .asm-complete-title {
      font-family: 'Fraunces', serif;
      font-size: 2.4rem;
      font-weight: 900;
      background: linear-gradient(to right, #3d0040, #800080);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0 0 8px;
    }
    .asm-complete-msg { font-size: 1rem; color: #6b3e6b; margin-bottom: 20px; }
    .asm-final-summary {
      background: white;
      border-radius: 16px;
      border: 1px solid rgba(128,0,128,0.1);
      padding: 16px 20px;
      text-align: left;
      max-width: 440px;
      margin: 0 auto;
    }
    .asm-final-line {
      font-size: 0.95rem;
      color: #3d0040;
      line-height: 1.7;
      padding: 4px 0;
      border-bottom: 1px dashed #f0e0f0;
    }
    .asm-final-line:last-child { border-bottom: none; }

    /* ── Action buttons ── */
    .asm-actions {
      display: flex;
      justify-content: center;
      gap: 16px;
      padding: 20px 24px;
      background: white;
      border-top: 1px solid rgba(128,0,128,0.08);
      flex-wrap: wrap;
    }
    .asm-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      width: 100px;
      height: 100px;
      border: none;
      border-radius: 20px;
      cursor: pointer;
      font-weight: 800;
      font-size: 0.9rem;
      transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      box-shadow: 0 6px 20px rgba(0,0,0,0.1);
    }
    .asm-btn:hover:not(:disabled) { transform: translateY(-5px) scale(1.06); }
    .asm-btn:disabled { opacity: 0.32; cursor: not-allowed; transform: none !important; }
    .asm-btn-icon  { font-size: 2rem; }
    .asm-btn-label { font-size: 0.78rem; font-weight: 700; letter-spacing: 0.02em; }

    .asm-btn-speak {
      background: linear-gradient(135deg, #800080, #5c0057);
      color: white;
    }
    .asm-btn-speak:not(:disabled) { box-shadow: 0 8px 24px rgba(128,0,128,0.38); }

    .asm-btn-repeat {
      background: linear-gradient(135deg, #4f46e5, #3730a3);
      color: white;
    }
    .asm-btn-repeat:not(:disabled) { box-shadow: 0 8px 24px rgba(79,70,229,0.35); }

    .asm-btn-stop {
      background: linear-gradient(135deg, #e11d48, #be123c);
      color: white;
    }
    .asm-btn-stop:not(:disabled) { box-shadow: 0 8px 24px rgba(225,29,72,0.35); }

    /* Warning */
    .asm-warning {
      text-align: center;
      font-size: 0.82rem;
      color: #92400e;
      background: #fef3c7;
      border: 1px solid #fcd34d;
      border-radius: 10px;
      padding: 10px 18px;
      margin: 0 24px 16px;
    }
    
    /* ═════════ PREMIUM CONTENT REDESIGN ═════════ */
    
    /* Premium List Grid & Card */
    .content-list-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 30px;
    }
    .content-card-modern {
      position: relative;
      border-radius: 24px;
      padding: 0;
      cursor: pointer;
      overflow: hidden;
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      box-shadow: 0 10px 30px rgba(128,0,128,0.06);
      background: white;
      border: 1px solid rgba(128,0,128,0.05);
      z-index: 1;
    }
    .content-card-modern:hover {
      transform: translateY(-8px) scale(1.02);
      box-shadow: 0 20px 40px rgba(128,0,128,0.15);
      border-color: rgba(128,0,128,0.2);
    }
    .content-card-bg {
      position: absolute;
      top: 0; right: 0; bottom: 0; left: 0;
      background: linear-gradient(135deg, #fdfbfd 0%, #f5e6f5 100%);
      z-index: -2;
    }
    .content-card-modern::before {
      content: '';
      position: absolute;
      top: -50px; right: -50px;
      width: 150px; height: 150px;
      background: rgba(128,0,128,0.07);
      border-radius: 50%;
      filter: blur(30px);
      transition: all 0.4s ease;
      z-index: -1;
    }
    .content-card-modern:hover::before {
      transform: scale(1.5);
      background: rgba(128,0,128,0.12);
    }
    .content-card-glass {
      padding: 28px;
    }
    .content-badge-premium {
      background: linear-gradient(135deg, #3d0040, #800080);
      color: white;
      padding: 6px 14px;
      border-radius: 50px;
      box-shadow: 0 4px 12px rgba(128,0,128,0.25);
    }
    .premium-stade {
      color: #800080;
      background: rgba(128,0,128,0.05);
      padding: 4px 12px;
      border-radius: 50px;
      font-weight: 700;
    }
    .content-title-premium {
      font-family: 'Fraunces', serif;
      font-size: 1.4rem;
      font-weight: 800;
      margin-top: 15px;
      margin-bottom: 12px;
      background: linear-gradient(to right, #3d0040, #800080);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      line-height: 1.3;
    }
    .content-desc-premium {
      font-size: 0.95rem;
      color: #6b3e6b;
      margin-bottom: 24px;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .content-footer-premium {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 16px;
      border-top: 1px solid rgba(128,0,128,0.08);
    }
    .premium-play {
      background: #800080;
      padding: 10px 22px;
      border-radius: 50px;
    }

    /* Premium Content Detail */
    .content-view-premium {
      max-width: 1200px;
      margin: 0 auto;
    }
    .content-header-premium {
      text-align: center;
      padding: 60px 20px;
      position: relative;
      background: linear-gradient(to bottom, #fdfbfd 0%, transparent 100%);
      border-radius: 30px;
      margin-bottom: 30px;
      overflow: hidden;
    }
    .content-halo {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 100%; height: 100%;
      background: radial-gradient(circle at center, rgba(128,0,128,0.08) 0%, transparent 70%);
      z-index: 0;
      pointer-events: none;
    }
    .premium-meta {
      position: relative;
      z-index: 1;
      justify-content: center;
      margin-bottom: 24px;
    }
    .premium-badge {
      background: white;
      color: #800080;
      border: 1px solid rgba(128,0,128,0.1);
      box-shadow: 0 4px 15px rgba(128,0,128,0.05);
      font-size: 0.85rem;
      padding: 8px 16px;
      border-radius: 50px;
    }
    .premium-duration {
      font-weight: 700;
      color: #6b3e6b;
      background: rgba(255,255,255,0.6);
      padding: 6px 14px;
      border-radius: 50px;
      backdrop-filter: blur(10px);
    }
    .content-title-giant {
      position: relative;
      z-index: 1;
      font-family: 'Fraunces', serif;
      font-size: 3.5rem;
      font-weight: 900;
      background: linear-gradient(135deg, #3d0040, #800080);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      line-height: 1.15;
      max-width: 900px;
      margin: 0 auto;
    }
    .video-wrapper-premium {
      border-radius: 28px;
      overflow: hidden;
      border: 1px solid rgba(128,0,128,0.15);
      position: relative;
      box-shadow: 0 25px 50px rgba(128,0,128,0.1) !important;
      background: #000;
    }
    .video-glow {
      position: absolute;
      top: -2px; left: -2px; right: -2px; bottom: -2px;
      background: linear-gradient(135deg, rgba(128,0,128,0.5), transparent, rgba(128,0,128,0.5));
      z-index: -1;
      filter: blur(15px);
    }
    .content-body-premium {
      margin-top: 40px;
      background: linear-gradient(180deg, #ffffff 0%, #faf5ff 100%);
      border: 1px solid rgba(128,0,128,0.1);
      box-shadow: 0 15px 35px rgba(128,0,128,0.04);
      padding: 50px;
    }
    .premium-label {
      font-size: 1rem;
      color: #3d0040;
      margin-bottom: 20px;
    }
    .premium-desc {
      font-size: 1.15rem;
      color: #2d3748;
      line-height: 1.8;
      font-weight: 500;
    }
  `]
})
export class EducationComponent implements OnInit, OnDestroy {
  selectedType: 'QUIZ' | 'GAME' | 'CONTENT' | 'EXERCICE' | null = null;
  playingActivity: ActivityModel | null = null;

  // ── Audio Session state ──────────────────────────────────────
  showAudioSession    = false;
  audioSessionId      = '';
  currentLoopId       = 0;
  audioState: 'idle' | 'summary' | 'speaking' | 'listening' | 'done' = 'idle';
  audioCurrentText    = '';
  audioTotalQuestions = 0;
  audioCurrentIndex   = 0;
  audioFinalSummary:  string[] = [];
  audioSummary:       string[] = [];
  audioChoices:       any[]    = [];
  audioSessionComplete = false;
  audioLanguage: 'fr' | 'en' = 'fr';  // Patient's chosen session language
  // Score popup
  showScoreModal      = false;
  audioScoreCorrect   = 0;
  audioScorePartial   = 0;
  audioScoreIncorrect = 0;
  audioScoreTotal     = 0;
  speechRecognitionSupported = false;
  // Chat history for the visual conversation feed
  chatHistory: { speaker: 'ai' | 'patient'; text: string }[] = [];
  // Countdown seconds for the listening phase
  listenCountdown = 0;
  private countdownInterval: any = null;

  activities: ActivityModel[] = [];
  filteredActivities: ActivityModel[] = [];
  isLoading = true;
  errorMessage = '';

  patientScoreQuiz: number = 0;
  patientStadeQuiz: string = 'LEGER';
  completedStagesQuiz: string[] = [];

  patientScoreGame: number = 0;
  patientStadeGame: string = 'LEGER';
  completedStagesGame: string[] = [];

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

  sessionPointsEarned: number | null = null;
  sessionTotalPoints: number | null = null;

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
    private progressionService: PatientProgressionService,
    private audioSessionSvc: AudioSessionService,
    private alzAccessibility: AlzheimerAccessibilityService
  ) { }

  ngOnDestroy(): void {
    // Stop AI audio session (mic + TTS)
    this.audioSessionSvc.stopAll();
    this.clearCountdown();
    // Stop any navigation voice narration so it doesn't bleed into other pages
    this.alzAccessibility.stopNavSpeech();
  }

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
          this.completedStagesQuiz = data.completedStagesQuiz || [];
          this.patientScoreGame = data.scoreGame;
          this.patientStadeGame = data.stadeGame;
          this.completedStagesGame = data.completedStagesGame || [];
          if (this.selectedType) {
            this.selectType(this.selectedType);
          }
        },
        error: (err) => console.error('Erreur chargement progression:', err)
      });
    }
  }

  /** Resets the patient's level for the currently selected category (QUIZ or GAME) */
  resetLevel(): void {
    if (!this.selectedType) return;
    if (this.selectedType !== 'QUIZ' && this.selectedType !== 'GAME') return;

    const confirmReset = confirm(`Êtes-vous sûr de vouloir réinitialiser votre progression pour les ${this.selectedType === 'QUIZ' ? 'Quiz' : 'Jeux'} ? Cette action est irréversible.`);
    if (!confirmReset) return;

    const user = this.authService.getCurrentUser();
    if (user && user.id) {
      this.isLoading = true;
      this.progressionService.resetPatient(user.id, this.selectedType).subscribe({
        next: () => {
          console.log('Progression réinitialisée !');
          this.loadPatientProgression(); // Refreshes UI and returns to LEGER
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Erreur lors de la réinitialisation:', err);
          this.errorMessage = 'Une erreur est survenue lors de la réinitialisation.';
          this.isLoading = false;
        }
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

  /** True if the patient has successfully finished this stage at least once */
  isStageCompleted(stade: string): boolean {
    if (this.selectedType === 'QUIZ') return this.completedStagesQuiz.includes(stade);
    if (this.selectedType === 'GAME') return this.completedStagesGame.includes(stade);
    return false;
  }

  /** True if the stage is ahead of the patient's current stage (not yet unlocked)
   * OR if it's a past stage that was NOT completed (failed bypassed)
   */
  isStageLocked(stade: string): boolean {
    const currentIndex = this.STAGE_ORDER.indexOf(this.getPatientStade());
    const stadeIndex = this.STAGE_ORDER.indexOf(stade);

    // Locked if it's a future stage
    if (stadeIndex > currentIndex) return true;

    // Locked if it's a past stage but was NEVER completed with success
    if (stadeIndex < currentIndex && !this.isStageCompleted(stade)) return true;

    return false;
  }

  /** True if the stage is ahead of current (for visual lock icons) */
  isStageLockedFuture(stade: string): boolean {
    const currentIndex = this.STAGE_ORDER.indexOf(this.getPatientStade());
    const stadeIndex = this.STAGE_ORDER.indexOf(stade);
    return stadeIndex > currentIndex;
  }

  /** Click handler that respects stage access */
  onActivityClick(activity: ActivityModel, stade: string): void {
    if (this.isStageLocked(stade)) return;
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
          this.sessionPointsEarned = res.scoreSession;
          this.sessionTotalPoints = res.scoreCumule;
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
          this.completedStagesQuiz = data.completedStagesQuiz || [];
          this.patientScoreGame = data.scoreGame;
          this.patientStadeGame = data.stadeGame;
          this.completedStagesGame = data.completedStagesGame || [];
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
    this.resetAudioSession();
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

    this.sessionPointsEarned = null;
    this.sessionTotalPoints = null;
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

  /** Returns the number of matched pairs found so far */
  getMatchedPairs(): number {
    return this.memoryCards.filter(c => c.matched).length / 2;
  }

  // ═══ CONTENT ═══

  initContent(data: any): void {
    this.contentData = data;
    if (data.contentType === 'video' && data.videoUrl) {
      this.safeVideoUrl = this.getEmbedUrl(data.videoUrl);
    }
    // Reset audio state whenever a new CONTENT activity is loaded
    this.resetAudioSession();
    this.speechRecognitionSupported = this.audioSessionSvc.isSpeechRecognitionSupported();
  }

  // ═══ AUDIO AI SESSION ═══

  private resetAudioSession(): void {
    this.currentLoopId++; // Break any active async loops immediately
    this.audioSessionSvc.stopAll();
    this.alzAccessibility.resumeGlobalListening();
    this.clearCountdown();
    this.showAudioSession     = false;
    this.audioSessionId       = '';
    this.audioState           = 'idle';
    this.audioCurrentText     = '';
    this.audioTotalQuestions  = 0;
    this.audioCurrentIndex    = 0;
    this.audioFinalSummary    = [];
    this.audioSessionComplete = false;
    this.audioChoices         = [];
    this.chatHistory          = [];
    this.listenCountdown      = 0;
    // Reset score modal
    this.showScoreModal      = false;
    this.audioScoreCorrect   = 0;
    this.audioScorePartial   = 0;
    this.audioScoreIncorrect = 0;
    this.audioScoreTotal     = 0;
    console.log('[AudioSession] State fully reset.');
  }

  /** Called when the patient clicks "Commencer l'exercice audio" */
  async startAudioSession(): Promise<void> {
    this.currentLoopId++; // Cancel any previous pending session logic
    const loopId = this.currentLoopId;

    this.alzAccessibility.pauseGlobalListening();
    this.resetAudioSession(); 
    // Important: we just called resetAudioSession which incremented currentLoopId again. 
    // Let's just fix resetAudioSession to NOT increment if we are already starting.
    // Actually, let's keep it simple: resetAudioSession() inside here is fine if it's the first thing.
    
    // RE-INIT loopId after reset
    this.currentLoopId++;
    const activeLoopId = this.currentLoopId;

    this.alzAccessibility.pauseGlobalListening();
    
    const user     = this.authService.getCurrentUser();
    const patientId = user?.id || 'anonymous';
    const activity = this.playingActivity;
    if (!activity) return;

    // --- DEBUG LOGS ---
    console.log('[AudioSession] Activity Data:', activity);
    console.log('[AudioSession] Content Data:', this.contentData);
    const videoUrl = this.contentData?.videoUrl || '';
    console.log('[AudioSession] URL being sent:', videoUrl);

    this.showAudioSession = true;
    this.audioState       = 'idle';
    this.audioCurrentText = 'Chargement de l\'exercice...';

    try {
      const res = await this.audioSessionSvc.initSession(
        activity.id!,
        patientId,
        activity.description || '',
        activity.title || '',
        videoUrl,
        this.audioLanguage
      ).toPromise() as any;

      if (this.currentLoopId !== activeLoopId || !this.showAudioSession) return;

      this.audioSessionId      = res.sessionId;
      this.audioTotalQuestions = res.totalQuestions;
      this.audioCurrentIndex   = 0;

      // 1. Speak the summary sentences
      this.audioState = 'speaking';
      for (const line of res.summary as string[]) {
        if (this.currentLoopId !== activeLoopId || !this.showAudioSession) return;
        this.audioCurrentText = line;
        this.scrollChatToBottom();
        await this.audioSessionSvc.speak(line);
        if (this.currentLoopId !== activeLoopId || !this.showAudioSession) return;
        this.addAiMessage(line);
        await this.delay(500);
      }

      // 2. Speak first question then start listening
      if (this.currentLoopId !== activeLoopId || !this.showAudioSession) return;
      if (res.firstQuestion) {
        this.audioCurrentText = res.firstQuestion;
        this.scrollChatToBottom();
        await this.audioSessionSvc.speak(res.firstQuestion);
        if (this.currentLoopId !== activeLoopId || !this.showAudioSession) return;
        this.addAiMessage(res.firstQuestion);
        await this.delay(400);
        if (this.currentLoopId !== activeLoopId || !this.showAudioSession) return;
        await this.listenAndProcess(activeLoopId);
      } else {
        this.endSession([]);
      }
    } catch (err) {
      console.error('Audio session init error:', err);
      this.audioState = 'idle';
      this.audioCurrentText = 'Impossible de démarrer l\'exercice audio.';
    }
  }

  /** Patient presses the "Parler" button — restart listening for current question */
  async onAudioSpeak(): Promise<void> {
    if (this.audioState === 'listening') return;
    this.audioSessionSvc.stopSpeaking();
  }

  /** Patient presses "Répéter" — resets the conversation and re-reads the current question */
  async onAudioRepeat(): Promise<void> {
    if (!this.audioSessionId) return;
    this.currentLoopId++;
    const loopId = this.currentLoopId;

    this.audioSessionSvc.stopAll();
    this.clearCountdown();

    this.audioState = 'speaking';
    try {
      const res: any = await this.audioSessionSvc.repeatQuestion(this.audioSessionId).toPromise();
      if (this.currentLoopId !== loopId) return;
      this.audioCurrentText = res.feedback;
      await this.audioSessionSvc.speak(res.feedback);
      this.addAiMessage(res.feedback);
      await this.delay(400);
      await this.listenAndProcess(loopId);
    } catch (err) {
      console.error('Repeat error:', err);
    }
  }

  /** Patient presses "Arrêter" — immediately stop everything and close the session */
  async onAudioStop(): Promise<void> {
    // 1. Kill the loop immediately (no more callbacks)
    this.currentLoopId++;

    // 2. Stop mic + TTS + countdown right away
    this.audioSessionSvc.stopAll();
    this.clearCountdown();
    this.listenCountdown = 0;

    // 3. Notify the backend and capture score
    if (this.audioSessionId) {
      try {
        const res: any = await this.audioSessionSvc.stopSession(this.audioSessionId).toPromise();
        this.endSession([], res?.correctAnswers ?? 0, res?.partialAnswers ?? 0, res?.incorrectAnswers ?? 0, this.audioTotalQuestions);
      } catch {
        this.endSession([]);
      }
    } else {
      this.endSession([]);
    }
  }

  /** Core loop: listen → send answer → handle response → repeat or end */
  private async listenAndProcess(loopId: number): Promise<void> {
    if (!this.audioSessionId || this.currentLoopId !== loopId) return;

    this.audioState = 'listening';
    // Visual countdown: 30 seconds (matches the real audio capture window)
    this.startCountdown(30);
    // Give the patient 30 seconds to speak — mic auto-restarts if Chrome cuts early
    const transcript = await this.audioSessionSvc.listen(30000);
    this.clearCountdown();
    this.listenCountdown = 0;

    // Log patient speech (or silence) to chat
    const displayText = transcript.trim() ? transcript.trim() : '(silence)';
    this.chatHistory.push({ speaker: 'patient', text: displayText });
    this.scrollChatToBottom();

    this.audioState       = 'speaking';
    this.audioCurrentText = transcript.trim() ? `"${transcript}"` : '(silence détecté)';
    this.scrollChatToBottom();
    await this.delay(400);

    try {
      const res: any = await this.audioSessionSvc.processAnswer(this.audioSessionId, transcript).toPromise();

      if (this.currentLoopId !== loopId || !this.showAudioSession) return;

      // Speak feedback
      this.audioCurrentText = res.feedback;
      this.scrollChatToBottom();
      await this.audioSessionSvc.speak(res.feedback);
      if (this.currentLoopId !== loopId || !this.showAudioSession) return;
      this.addAiMessage(res.feedback);
      await this.delay(500);

      // Speak hint if present
      if (res.hint && res.hint.length > 0) {
        if (this.currentLoopId !== loopId || !this.showAudioSession) return;
        this.audioCurrentText = res.hint;
        this.scrollChatToBottom();
        await this.audioSessionSvc.speak(res.hint);
        if (this.currentLoopId !== loopId || !this.showAudioSession) return;
        this.addAiMessage(res.hint);
        await this.delay(400);
      }

      if (this.currentLoopId !== loopId || !this.showAudioSession) return;
      if (res.sessionFinished) {
        this.endSession(
          res.finalSummary || [],
          res.correctAnswers ?? 0,
          res.partialAnswers ?? 0,
          res.incorrectAnswers ?? 0,
          res.totalQuestions ?? this.audioTotalQuestions
        );
        if (res.finalSummary?.length) {
          for (const line of res.finalSummary) {
            if (this.currentLoopId !== loopId || !this.showAudioSession) return;
            await this.audioSessionSvc.speak(line);
            if (this.currentLoopId !== loopId || !this.showAudioSession) return;
            await this.delay(900);
          }
        }
        return;
      }

      // Update question index
      this.audioCurrentIndex = res.currentQuestionIndex;

      // Speak next question
      if (res.nextQuestion) {
        if (this.currentLoopId !== loopId || !this.showAudioSession) return;
        this.audioCurrentText = res.nextQuestion;
        this.scrollChatToBottom();
        await this.audioSessionSvc.speak(res.nextQuestion);
        if (this.currentLoopId !== loopId || !this.showAudioSession) return;
        this.addAiMessage(res.nextQuestion);
        await this.delay(400);
        if (this.currentLoopId !== loopId || !this.showAudioSession) return;
        await this.listenAndProcess(loopId);
      } else {
        if (this.currentLoopId !== loopId || !this.showAudioSession) return;
        await this.listenAndProcess(loopId);
      }
    } catch (err) {
      console.error('Process answer error:', err);
      this.audioState = 'idle';
    }
  }

  private endSession(finalSummary: string[], correct = 0, partial = 0, incorrect = 0, total = 0): void {
    this.clearCountdown();
    this.audioState           = 'done';
    this.audioFinalSummary    = finalSummary;
    this.audioSessionComplete = true;
    this.audioCurrentText     = '';
    // Store score and show modal
    this.audioScoreCorrect   = correct;
    this.audioScorePartial   = partial;
    this.audioScoreIncorrect = incorrect;
    this.audioScoreTotal     = total || this.audioTotalQuestions;
    setTimeout(() => { this.showScoreModal = true; }, 800); // slight delay after done card appears
  }

  /** Adds an AI message to the conversation feed and scrolls to bottom */
  private addAiMessage(text: string): void {
    this.chatHistory.push({ speaker: 'ai', text });
    this.scrollChatToBottom();
  }

  private scrollChatToBottom(): void {
    setTimeout(() => {
      const feed = document.getElementById('asm-chat-feed');
      if (feed) feed.scrollTop = feed.scrollHeight;
    }, 50);
  }

  /** Starts a visual countdown (seconds) for listening phase */
  private startCountdown(seconds: number): void {
    this.clearCountdown();
    this.listenCountdown = seconds;
    this.countdownInterval = setInterval(() => {
      this.listenCountdown--;
      if (this.listenCountdown <= 0) this.clearCountdown();
    }, 1000);
  }

  private clearCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getEmbedUrl(youtubeUrl: string): SafeResourceUrl {
    if (!youtubeUrl) return '';
    const videoId = this.extractYoutubeId(youtubeUrl);
    if (videoId) {
      // Use youtube-nocookie.com to avoid tracker blockers preventing IP resolution
      const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
      return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
    }
    // Fallback : au cas où le lien n'est pas un lien YouTube standard (Dailymotion, un lien direct, etc.)
    // La vidéo s'affichera directement dans l'iframe avec l'URL fournie.
    return this.sanitizer.bypassSecurityTrustResourceUrl(youtubeUrl);
  }

  private extractYoutubeId(url: string): string | null {
    if (!url) return null;
    // Support watch?v=, youtu.be/, embed/, v/, shorts/ and extract exactly 11 chars
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
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