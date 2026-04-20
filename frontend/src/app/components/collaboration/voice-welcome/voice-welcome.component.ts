import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GuidanceService } from '../../../services/collaboration/guidance.service';

@Component({
  selector: 'app-voice-welcome',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="guidance.showWelcomeOverlay()"
         class="voice-overlay"
         role="dialog"
         aria-modal="true"
         aria-label="Voice assistance preference">

      <div class="voice-card">

        <div class="voice-icon">
          <i class="fa-solid fa-volume-high"></i>
        </div>

        <h2>Voice Assistance</h2>
        <p class="subtitle">
          Would you like the app to read things aloud for you?
        </p>
        <p class="detail">
          It will describe buttons, read messages, and guide you through every page.
          You can change this at any time.
        </p>

        <div class="choice-row">
          <button class="choice-btn yes" (click)="guidance.enableVoice()">
            <i class="fa-solid fa-volume-high me-2"></i> Yes, read aloud
          </button>
          <button class="choice-btn no" (click)="guidance.disableVoice()">
            <i class="fa-solid fa-volume-xmark me-2"></i> No thanks
          </button>
        </div>

        <p class="footer-note">
          You can turn voice on or off anytime using the 🔊 button in the top bar.
        </p>
      </div>
    </div>
  `,
  styles: [`
    .voice-overlay {
      position: fixed;
      inset: 0;
      background: rgba(10, 20, 60, 0.88);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(6px);
      animation: fadeIn 0.35s ease;
    }
    @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

    .voice-card {
      background: white;
      border-radius: 24px;
      padding: 48px 40px 36px;
      max-width: 460px;
      width: 92%;
      text-align: center;
      box-shadow: 0 32px 80px rgba(0,0,0,0.35);
      animation: slideUp 0.35s ease;
    }
    @keyframes slideUp {
      from { transform: translateY(32px); opacity: 0 }
      to   { transform: translateY(0);    opacity: 1 }
    }

    .voice-icon {
      width: 88px; height: 88px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 24px;
      font-size: 36px; color: white;
      box-shadow: 0 0 0 14px rgba(79,70,229,0.1);
      animation: pulse 2.5s infinite;
    }
    @keyframes pulse {
      0%,100% { box-shadow: 0 0 0 14px rgba(79,70,229,0.1) }
      50%      { box-shadow: 0 0 0 22px rgba(79,70,229,0.05) }
    }

    h2 {
      font-size: 1.75rem;
      font-weight: 900;
      color: #1e1b4b;
      margin-bottom: 12px;
    }

    .subtitle {
      font-size: 1.05rem;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }

    .detail {
      font-size: 0.9rem;
      color: #6b7280;
      margin-bottom: 32px;
      line-height: 1.6;
    }

    .choice-row {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-bottom: 20px;
    }

    .choice-btn {
      flex: 1;
      border: none;
      border-radius: 50px;
      padding: 16px 20px;
      font-size: 1rem;
      font-weight: 800;
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .choice-btn:hover  { transform: translateY(-2px) }
    .choice-btn:active { transform: translateY(0) }

    .choice-btn.yes {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: white;
      box-shadow: 0 6px 20px rgba(79,70,229,0.4);
    }
    .choice-btn.no {
      background: #f3f4f6;
      color: #374151;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .footer-note {
      font-size: 0.78rem;
      color: #9ca3af;
      margin: 0;
    }
  `]
})
export class VoiceWelcomeComponent {
  guidance = inject(GuidanceService);
}
