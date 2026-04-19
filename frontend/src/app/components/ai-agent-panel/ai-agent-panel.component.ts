import {
  Component, OnInit, OnDestroy, Input,
  ChangeDetectorRef, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TranscriptLine {
  speaker: 'doctor' | 'patient';
  text: string;
  timestamp: Date;
}

export interface LiveAnalysis {
  emotion: {
    label: string;
    intensity: number;
    color: string;
    icon: string;
    trend: 'stable' | 'improving' | 'worsening';
  };
  patientSummary: string;
  suggestedQuestions: string[];
  redFlag: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-ai-agent-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-agent-panel.component.html',
  styleUrl: './ai-agent-panel.component.css'
})
export class AiAgentPanelComponent implements OnInit, OnDestroy {

  @Input() patientName: string = 'Patient';
  @Input() doctorName: string = 'Médecin';

  // ── UI State ───────────────────────────────────────────────────────────────
  public isListening = false;
  public isAnalyzing = false;
  public activeSpeaker: 'doctor' | 'patient' = 'patient';
  public showTranscript = false;

  // ── Data ───────────────────────────────────────────────────────────────────
  public transcript: TranscriptLine[] = [];
  public analysis: LiveAnalysis | null = null;
  public analysisCount = 0;
  public lastAnalysisAt: Date | null = null;
  public interimText = '';
  public errorMessage = '';
  public manualText = '';
  public copiedIndex: number | null = null;

  // ── Private ────────────────────────────────────────────────────────────────
  private recognition: any = null;
  private newPatientLines = 0;
  private readonly TRIGGER = 1; // analyse after every patient utterance

  constructor(private cdr: ChangeDetectorRef, private zone: NgZone) { }

  ngOnInit(): void { this.initSpeechRecognition(); }
  ngOnDestroy(): void { this.stopListening(); }

  // ── Speech Recognition ─────────────────────────────────────────────────────

  private initSpeechRecognition(): void {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      this.errorMessage = 'SpeechRecognition non supporté — utilisez Chrome ou Edge.';
      return;
    }

    this.recognition = new SR();
    this.recognition.lang = 'fr-FR';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;

    this.recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) {
          const text = r[0].transcript.trim();
          if (text.length > 2) {
            this.zone.run(() => { this.interimText = ''; this.addLine(this.activeSpeaker, text); });
          }
        } else {
          interim += r[0].transcript;
        }
      }
      this.zone.run(() => { this.interimText = interim; this.cdr.detectChanges(); });
    };

    this.recognition.onerror = (e: any) => {
      console.error('Speech Recognition Error:', e.error);
      if (e.error === 'no-speech') return;
      
      this.zone.run(() => { 
        if (e.error === 'network') {
          this.errorMessage = 'Erreur réseau microphone logicielle. Vérifiez votre connexion ou actualisez la page.';
        } else {
          this.errorMessage = `Micro : ${e.error}`;
        }
        this.cdr.detectChanges(); 
      });
      
      // If network error, stop listening to avoid infinite loops, but allow user to retry
      if (e.error === 'network') {
        this.stopListening();
      }
    };

    this.recognition.onend = () => {
      // Auto-restart ONLY if no fatal error like 'network' happened
      if (this.isListening && !this.errorMessage) {
        try { this.recognition.start(); } catch { }
      }
    };
  }

  public startListening(): void {
    const hadNetworkError = this.errorMessage.includes('réseau');
    this.errorMessage = '';
    
    // If recognition is not initialized or we had a network error previously, recreate it
    if (!this.recognition || hadNetworkError) {
      this.initSpeechRecognition();
    }
    
    this.isListening = true;
    try { 
      this.recognition.start(); 
    } catch (e) {
      // already started
    }
  }

  public stopListening(): void {
    this.isListening = false;
    this.interimText = '';
    if (this.recognition) try { this.recognition.stop(); } catch { }
  }

  public toggleSpeaker(): void {
    this.activeSpeaker = this.activeSpeaker === 'patient' ? 'doctor' : 'patient';
  }

  private addLine(speaker: 'doctor' | 'patient', text: string): void {
    this.transcript.push({ speaker, text, timestamp: new Date() });
    if (speaker === 'patient') {
      this.newPatientLines++;
      if (this.newPatientLines >= this.TRIGGER) this.analyzeNow();
    }
    this.cdr.detectChanges();
  }

  public addManualLine(): void {
    const t = this.manualText.trim();
    if (t.length < 2) return;
    this.addLine(this.activeSpeaker, t);
    this.manualText = '';
  }

  /** Inject a test phrase directly as patient speech (for demo/testing) */
  public addTestPhrase(text: string): void {
    this.addLine('patient', text);
  }

  // ── Claude API ────────────────────────────────────────────────────────────

  public async analyzeNow(): Promise<void> {
    if (this.transcript.length === 0 || this.isAnalyzing) return;
    this.isAnalyzing = true;
    this.newPatientLines = 0;
    this.errorMessage = '';
    this.cdr.detectChanges();

    const transcriptText = this.transcript
      .map(l => `[${l.speaker === 'doctor' ? 'MÉDECIN' : 'PATIENT'}]: ${l.text}`)
      .join('\n');

    const prevCtx = this.analysis
      ? `Analyse précédente : état "${this.analysis.emotion.label}", intensité ${this.analysis.emotion.intensity}/100.`
      : 'Première analyse de la consultation.';

    const systemPrompt = `Tu es un assistant médical expert en maladie d'Alzheimer qui aide un médecin EN TEMPS RÉEL pendant une téléconsultation.
${prevCtx}

Analyse la transcription et retourne UNIQUEMENT un JSON valide (sans backticks ni markdown) :
{
  "emotion": {
    "label": "Calme | Coopératif | Anxieux | Confus | Agité | Triste | Apathique | Désorienté",
    "intensity": number 0-100,
    "color": "hex (ex: #10b981 calme, #3b82f6 coopératif, #f59e0b anxieux, #ef4444 agité, #8b5cf6 confus)",
    "icon": "emoji unique",
    "trend": "stable | improving | worsening"
  },
  "patientSummary": "2-3 phrases : ce que le patient exprime, ses préoccupations visibles, hésitations ou répétitions notables",
  "suggestedQuestions": [
    "question courte et simple prête à être posée par le médecin",
    "question 2",
    "question 3"
  ],
  "redFlag": "alerte clinique urgente si confusion grave / détresse / agressivité — sinon null"
}
Règles : questions concrètes adaptées Alzheimer, résumé centré patient, JSON uniquement.`;

    try {
      const res = await fetch('http://localhost:8080/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcriptText,
          systemPrompt
        })
      });

      const textResponse = await res.text();

      let data;
      try {
        data = JSON.parse(textResponse);
      } catch (e) {
        console.error("BACKEND RAW =", textResponse);
        this.errorMessage = "Réponse backend invalide";
        this.isAnalyzing = false;
        this.cdr.detectChanges();
        return;
      }
      const raw = data.result || '';

      let parsed: LiveAnalysis;

      try {
        let clean = raw;

        clean = clean.substring(clean.indexOf('{'));
        clean = clean.substring(0, clean.lastIndexOf('}') + 1);
        clean = clean.trim();

        parsed = JSON.parse(clean);

      } catch (err) {
        console.error("RAW IA =", raw);

        // 🔥 FALLBACK SAFE
        parsed = {
          emotion: {
            label: "Confus",
            intensity: 50,
            color: "#8b5cf6",
            icon: "😕",
            trend: "stable"
          },
          patientSummary: "Analyse indisponible (format IA incorrect).",
          suggestedQuestions: [
            "Pouvez-vous répéter ?",
            "Où êtes-vous actuellement ?",
            "Quel jour sommes-nous ?"
          ],
          redFlag: null
        };
      }
      this.zone.run(() => {
        this.analysis = parsed;
        this.analysisCount++;
        this.lastAnalysisAt = new Date();
        this.isAnalyzing = false;
        this.cdr.detectChanges();
      });
    } catch (err: any) {
      this.zone.run(() => {
        this.errorMessage = 'Erreur : ' + (err?.message ?? 'inconnue');
        this.isAnalyzing = false;
        this.cdr.detectChanges();
      });
    }
  }

  // ── Utilities ──────────────────────────────────────────────────────────────

  public formatTime(d: Date): string {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  public getTrendIcon(t: string): string {
    return { stable: '→', improving: '↑', worsening: '↓' }[t] ?? '→';
  }

  public getTrendClass(t: string): string {
    return { stable: 'trend-stable', improving: 'trend-up', worsening: 'trend-down' }[t] ?? '';
  }

  public async copyQuestion(q: string, i: number): Promise<void> {
    try {
      await navigator.clipboard.writeText(q);
      this.copiedIndex = i;
      setTimeout(() => { this.copiedIndex = null; this.cdr.detectChanges(); }, 1800);
      this.cdr.detectChanges();
    } catch { }
  }

  public clearSession(): void {
    this.transcript = []; this.analysis = null;
    this.analysisCount = 0; this.lastAnalysisAt = null;
    this.errorMessage = ''; this.newPatientLines = 0;
    this.cdr.detectChanges();
  }
}