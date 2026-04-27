import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { PatientService } from '../services/patient.service';
import { AnalyseService } from '../services/analyse.service';
import { PatientProgressionService } from '../services/patient-progression.service';
import { AuthService } from '../services/auth.service';
import { AssignmentService } from '../services/assignment.service';
import { NotificationService } from '../services/notification.service';
import { RappelService } from '../services/rappel.service';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './patient-dashboard.component.html',
  styleUrl: './patient-dashboard.component.css'
})
export class PatientDashboardComponent implements OnInit {
  patientId: number | null = null;
  patient: any = { nom: '', prenom: '', age: null, poids: null, sexe: 'Homme', user_id: null };
  analyses: any[] = [];

  newAnalyse: any = { rapport_medical: '', image_irm: '', score_jeu: null };
  selectedAnalyse: any = null;
  assignedDoctor: any = null;

  chatQuestion: string = '';
  chatHistory: {sender: string, text: string}[] = [];
  isChatting: boolean = false;

  isLoadingPatient = false;
  isLoadingAnalyses = false;
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  patientScoreQuiz: number = 0;
  patientStadeQuiz: string = 'LEGER';
  patientScoreGame: number = 0;
  patientStadeGame: string = 'LEGER';
  patientScoreFinal: number = 0;
  progressionHistory: any[] = [];
  isLoadingProgression = false;

  // Notifications
  notifications: any[] = [];
  unreadCount: number = 0;
  showNotificationPanel = false;
  isLoadingNotifications = false;

  // Reminders
  reminders: any[] = [];
  isLoadingReminders = false;
  isSummarizing: {[key: number]: boolean} = {};
  summaries: {[key: number]: string} = {};
  selectedRappel: any = null;

  constructor(
    private patientService: PatientService,
    private analyseService: AnalyseService,
    private progressionService: PatientProgressionService,
    private authService: AuthService,
    private assignmentService: AssignmentService,
    private notificationService: NotificationService,
    private rappelService: RappelService,
    private router: Router
  ) { }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user && user.id) {
       this.loadProgression(user.id);
       this.loadAssignedDoctor(user.id);
       // Removed loadNotifications/loadUnreadCount from here, they need patientId.
       
       // Automatically load patient profile for the connected user
       this.isLoadingPatient = true;
       this.patientService.getPatientByUserId(user.id).subscribe({
         next: (data) => {
           if (data && data.id) {
             this.patientId = data.id;
             this.patient = {
                nom: data.nom,
                prenom: data.prenom,
                age: data.age,
                poids: data.poids,
                sexe: data.sexe,
                user_id: data.user ? data.user.id : user.id
             };
             // Only load analyses & notifications when we have a valid patientId
             this.loadAnalyses();
             if (this.patientId) {
               this.loadNotifications(this.patientId);
               this.loadUnreadCount(this.patientId);
               this.loadReminders(this.patientId);
             }
           } else {
             // If patient doesn't exist yet, we keep patientId = null
             // so the profile creation form feels right. But we pre-fill name.
             this.patient.nom = user.nom || '';
             this.patient.prenom = user.prenom || '';
             this.patient.user_id = user.id;
           }
           this.isLoadingPatient = false;
         },
         error: (err) => {
           console.log('No patient record found for this user', err);
           this.patient.nom = user.nom || '';
           this.patient.prenom = user.prenom || '';
           this.patient.user_id = user.id;
           this.isLoadingPatient = false;
         }
       });
    }
  }

  goToContactDoctor() {
    this.router.navigate(['/contact-doctor']);
  }

  loadAssignedDoctor(userId: number) {
    this.assignmentService.getMedecinByPatient(userId).subscribe({
      next: (data) => {
        this.assignedDoctor = data;
      },
      error: () => {
        this.assignedDoctor = null;
      }
    });
  }

  loadProgression(userId: number) {
    this.isLoadingProgression = true;
    this.progressionService.getScoreAndStade(userId).subscribe({
      next: (data) => {
        this.patientScoreQuiz = data.scoreQuiz;
        this.patientStadeQuiz = data.stadeQuiz;
        this.patientScoreGame = data.scoreGame;
        this.patientStadeGame = data.stadeGame;
        this.patientScoreFinal = (this.patientScoreQuiz + this.patientScoreGame) / 2;
      },
      error: (err) => console.error(err)
    });

    this.progressionService.getHistory(userId).subscribe({
      next: (data) => {
        this.progressionHistory = data || [];
        this.isLoadingProgression = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoadingProgression = false;
      }
    });
  }

  showSuccess(msg: string) {
    this.successMessage = msg;
    this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 4000);
  }

  showError(msg: string) {
    this.errorMessage = msg;
    this.successMessage = '';
    setTimeout(() => this.errorMessage = '', 6000);
  }

  loadPatientProfile() {
    if (!this.patientId) return;
    this.isLoadingPatient = true;
    this.patientService.getPatientById(this.patientId!).subscribe({
      next: (data) => {
        if (data) {
          // Mapping object back if backend returns camelCase but we want our form bindings to be simple
          this.patient = {
            nom: data.nom,
            prenom: data.prenom,
            age: data.age,
            poids: data.poids,
            sexe: data.sexe,
            user_id: data.user ? data.user.id : 1
          };
        }
        this.isLoadingPatient = false;
      },
      error: (err) => {
        console.error("Failed to load patient", err);
        this.isLoadingPatient = false;
      }
    });
  }

  loadPatient() {
    if (!this.patientId) return;
    this.loadPatientProfile();
    this.loadAnalyses();
  }

  addPatient() {
    if (!this.patient.nom || !this.patient.prenom) {
      this.showError("Veuillez remplir au moins le nom et le prénom.");
      return;
    }
    this.isSubmitting = true;
    this.patientService.addPatient(this.patient).subscribe({
      next: (data) => {
        this.showSuccess(`Patient "${data.nom} ${data.prenom}" créé avec succès (ID: ${data.id})`);
        this.patientId = data.id;
        this.loadAnalyses();
        this.isSubmitting = false;
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || 'Erreur lors de la création du patient.';
        this.showError(`Erreur: ${msg}`);
        console.error('[PatientDashboard] addPatient error:', err);
        this.isSubmitting = false;
      }
    });
  }

  updateProfile() {
    if (!this.patientId) { this.showError('Aucun patient sélectionné. Créez-en un d\'abord.'); return; }
    this.isSubmitting = true;
    this.patientService.updatePatient(this.patientId!, this.patient).subscribe({
      next: () => {
        this.showSuccess("Patient mis à jour avec succès");
        this.isSubmitting = false;
      },
      error: (err) => {
        this.showError(err?.error?.message || 'Erreur de mise à jour.');
        this.isSubmitting = false;
      }
    });
  }

  deletePatient() {
    if (!this.patientId) { this.showError('Aucun patient à supprimer.'); return; }
    if (confirm("Êtes-vous sûr de vouloir supprimer votre profil ?")) {
      this.patientService.deletePatient(this.patientId!).subscribe({
        next: () => {
          this.showSuccess("Profil supprimé !");
          this.patientId = null;
          this.patient = { nom: '', prenom: '', age: null, poids: null, sexe: 'Homme', user_id: null };
          this.analyses = [];
        },
        error: (err) => this.showError(err?.error?.message || 'Erreur de suppression.')
      });
    }
  }

  loadAnalyses() {
    if (!this.patientId) return;
    this.isLoadingAnalyses = true;
    this.analyseService.getAnalysesByPatient(this.patientId!).subscribe({
      next: (data) => {
        this.analyses = data || [];
        this.isLoadingAnalyses = false;
      },
      error: () => this.isLoadingAnalyses = false
    });
  }

  submitAnalyse() {
    this.isSubmitting = true;
    const dateStr = new Date().toISOString().split('T')[0];

    if (!this.patientId) { this.showError('Sélectionnez ou créez un patient d\'abord.'); this.isSubmitting = false; return; }

    const interpretation = this.newAnalyse.interpretation || null;
    const risque = this.newAnalyse.pourcentage_risque || null;

    const saveToSpring = (obsJSON: string | null) => {
      const payload = {
        patient_id: this.patientId!,
        date: dateStr,
        statut: interpretation ? "TERMINÉ" : "EN_COURS",
        rapport_medical: this.newAnalyse.rapport_medical,
        image_irm: this.newAnalyse.image_irm,
        score_jeu: this.newAnalyse.score_jeu,
        pourcentage_risque: risque,
        interpretation: interpretation,
        observation_medicale: obsJSON
      };

      this.analyseService.addAnalyse(payload).subscribe({
        next: (data) => {
          console.log('[PatientDashboard] Analyse insérée avec succès:', data);
          this.showSuccess("Analyse envoyée et enregistrée dans la base de données !");
          this.newAnalyse = { rapport_medical: '', image_irm: '', score_jeu: null, interpretation: null, pourcentage_risque: null };
          this.loadAnalyses();
          this.isSubmitting = false;
        },
        error: (err) => {
          const msg = err?.error?.message || err?.message || err?.error || JSON.stringify(err);
          console.error('[PatientDashboard] Error submitAnalyse:', err);
          this.showError(`Erreur lors de l'envoi de l'analyse: ${msg}`);
          this.isSubmitting = false;
        }
      });
    };

    // If report exists, run Gemini Analysis before saving
    if (this.newAnalyse.rapport_medical) {
      console.log('[PatientDashboard] Calling Gemini /analyze-report...');
      this.analyseService.analyzeReport(
        this.newAnalyse.rapport_medical,
        interpretation || 'Pas de diagnostic IRM',
        this.newAnalyse.score_jeu ? this.newAnalyse.score_jeu.toString() : 'Non évalué'
      ).subscribe({
        next: (geminiData) => {
          console.log('[PatientDashboard] Gemini Success:', geminiData);
          saveToSpring(JSON.stringify(geminiData));
        },
        error: (err) => {
          console.error("Gemini API error:", err);
          this.showError("Le serveur IA Gemini est indisponible. Enregistrement sans résumé...");
          saveToSpring(null);
        }
      });
    } else {
      saveToSpring(null);
    }
  }

  onFileSelected(event: any, field: 'rapport_medical' | 'image_irm') {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.newAnalyse[field] = e.target.result;

        // Directly call ML API for Alzheimer classification
        if (field === 'image_irm') {
          console.log('[PatientDashboard] Image selected. Calling ML API...');
          this.isSubmitting = true; // Use existing submitting state or just hide/show logic
          this.newAnalyse.interpretation = null;
          this.newAnalyse.pourcentage_risque = null;
          
          this.analyseService.predictAlzheimer(this.newAnalyse.image_irm).subscribe({
            next: (mlResult) => {
              this.newAnalyse.interpretation = mlResult.prediction;
              this.newAnalyse.pourcentage_risque = mlResult.confidence;
              console.log('[PatientDashboard] ML API Success:', mlResult);
              this.isSubmitting = false;
            },
            error: (err) => {
              this.isSubmitting = false;
              console.error("Machine Learning API error:", err);
              this.showError("Impossible de joindre le serveur IA pour l'analyse immédiate.");
            }
          });
        }
      };
      reader.readAsDataURL(file);
    }
  }

  viewDetails(analyse: any) {
    this.selectedAnalyse = analyse;
    this.chatHistory = [];
    
    if (this.selectedAnalyse.observationMedicale) {
      try {
        this.selectedAnalyse.geminiData = JSON.parse(this.selectedAnalyse.observationMedicale);
      } catch (e) {
        console.warn("Failed to parse observationMedicale as JSON", e);
        this.selectedAnalyse.geminiData = null;
      }
    } else {
      this.selectedAnalyse.geminiData = null;
    }
  }

  sendMessage() {
    if (!this.chatQuestion.trim()) return;

    const reportContent = this.selectedAnalyse?.rapportMedical 
                       || this.selectedAnalyse?.observationMedicale 
                       || '';

    if (!reportContent) {
      this.chatHistory.push({
        sender: 'bot', 
        text: 'Aucun rapport médical disponible pour cette analyse.'
      });
      return;
    }

    const userQ = this.chatQuestion;
    this.chatHistory.push({sender: 'user', text: userQ});
    this.chatQuestion = '';
    this.isChatting = true;

    this.analyseService.chatWithReport(userQ, reportContent).subscribe({
      next: (response) => {
        this.chatHistory.push({sender: 'bot', text: response});
        this.isChatting = false;
      },
      error: (err) => {
        console.error("Chat error:", err);
        this.chatHistory.push({
          sender: 'bot', 
          text: 'Désolé, une erreur technique est survenue avec l\'assistant IA.'
        });
        this.isChatting = false;
      }
    });
  }

  // ── Notifications ───────────────────────────────────────────────

  loadNotifications(patientId: number) {
    this.isLoadingNotifications = true;
    this.notificationService.getLatest(patientId).subscribe({
      next: (data) => {
        this.notifications = data || [];
        this.isLoadingNotifications = false;
      },
      error: () => this.isLoadingNotifications = false
    });
  }

  loadUnreadCount(patientId: number) {
    this.notificationService.getUnreadCount(patientId).subscribe({
      next: (data) => this.unreadCount = data.count
    });
  }

  toggleNotificationPanel() {
    this.showNotificationPanel = !this.showNotificationPanel;
    if (this.showNotificationPanel && this.patientId) {
      this.loadNotifications(this.patientId);
    }
  }

  markAsRead(notif: any) {
    if (notif.isRead) return; 
    this.notificationService.markAsRead(notif.id).subscribe({
      next: () => {
        notif.isRead = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      }
    });
  }

  markAllAsRead() {
    const user = this.authService.getCurrentUser();
    if (user && user.id) {
      this.notificationService.markAllAsRead(user.id).subscribe({
        next: () => {
          this.notifications.forEach(n => n.isRead = true);
          this.unreadCount = 0;
          this.showSuccess("Toutes les notifications sont marquées comme lues.");
        }
      });
    }
  }

  // --- Reminders Logic ---
  loadReminders(patientId: number) {
    this.isLoadingReminders = true;
    this.rappelService.getByPatient(patientId).subscribe({
      next: (data) => {
        this.reminders = data.filter((r: any) => r.actif) || [];
        this.isLoadingReminders = false;
      },
      error: () => this.isLoadingReminders = false
    });
  }

  openRappel(rappel: any) {
    if (this.selectedRappel?.id === rappel.id) {
      this.selectedRappel = null; // toggle close
    } else {
      this.selectedRappel = rappel;
    }
  }

  getVoiceUrl(id: number) {
    return this.rappelService.getVoiceUrl(id);
  }

  summarizeVoice(rappel: any) {
    // Use cached summary if already fetched
    if (this.summaries[rappel.id] && !this.isSummarizing[rappel.id]) {
      // allow re-fetch if user clicked again — just re-call
    }
    this.isSummarizing[rappel.id] = true;
    this.rappelService.summarizeVoice(rappel.id).subscribe({
      next: (data) => {
        this.summaries[rappel.id] = data.summary;
        this.isSummarizing[rappel.id] = false;
      },
      error: (err) => {
        this.summaries[rappel.id] = 'Résumé indisponible pour le moment.';
        this.isSummarizing[rappel.id] = false;
      }
    });
  }
}
