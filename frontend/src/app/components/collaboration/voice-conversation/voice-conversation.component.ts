import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VoiceConversationService } from '../../../services/collaboration/voice-conversation.service';
import { GuidanceService } from '../../../services/collaboration/guidance.service';

@Component({
  selector: 'app-voice-conversation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="conv.activeTurn() as turn"
         class="voice-conv-overlay"
         role="dialog"
         aria-modal="true"
         aria-label="Voice assistant question">

      <div class="voice-conv-card">

        <!-- Animated mic / speaker icon -->
        <div class="voice-conv-icon" [class.listening]="conv.isListening()">
          <i class="fa-solid" [ngClass]="conv.isListening() ? 'fa-microphone' : 'fa-volume-high'"></i>
        </div>

        <!-- The question -->
        <p class="voice-conv-question">{{ turn.question }}</p>

        <!-- Listening indicator -->
        <div *ngIf="conv.isListening()" class="voice-conv-listening">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          <span class="ms-2 fs-13 text-muted fw-bold">Listening...</span>
        </div>

        <!-- Action buttons -->
        <div class="voice-conv-actions">
          <button *ngFor="let action of turn.actions"
                  class="voice-conv-btn"
                  (click)="conv.selectAction(action)">
            {{ action.label }}
          </button>
        </div>

        <!-- Dismiss -->
        <button class="voice-conv-dismiss" (click)="conv.dismiss()">
          <i class="fa-solid fa-xmark me-1"></i> Skip
        </button>
      </div>
    </div>
  `,
  styles: [`
    .voice-conv-overlay {
      position: fixed;
      inset: 0;
      background: rgba(10, 20, 60, 0.75);
      z-index: 10000;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 40px;
      backdrop-filter: blur(4px);
      animation: fadeIn 0.3s ease;
    }
    @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

    .voice-conv-card {
      background: white;
      border-radius: 24px 24px 16px 16px;
      padding: 32px 28px 24px;
      max-width: 480px;
      width: 92%;
      text-align: center;
      box-shadow: 0 -8px 40px rgba(0,0,0,0.3);
      animation: slideUp 0.35s ease;
    }
    @keyframes slideUp {
      from { transform: translateY(60px); opacity: 0 }
      to   { transform: translateY(0);    opacity: 1 }
    }

    .voice-conv-icon {
      width: 72px; height: 72px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 20px;
      font-size: 28px; color: white;
      box-shadow: 0 0 0 12px rgba(79,70,229,0.12);
      transition: all 0.3s;
    }
    .voice-conv-icon.listening {
      background: linear-gradient(135deg, #dc2626, #b91c1c);
      box-shadow: 0 0 0 12px rgba(220,38,38,0.15);
      animation: pulse 1s infinite;
    }
    @keyframes pulse {
      0%,100% { box-shadow: 0 0 0 12px rgba(220,38,38,0.15) }
      50%      { box-shadow: 0 0 0 20px rgba(220,38,38,0.05) }
    }

    .voice-conv-question {
      font-size: 1.15rem;
      font-weight: 700;
      color: #1e1b4b;
      margin-bottom: 20px;
      line-height: 1.5;
    }

    .voice-conv-listening {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }
    .dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: #dc2626;
      margin: 0 3px;
      animation: bounce 1.2s infinite;
    }
    .dot:nth-child(2) { animation-delay: 0.2s }
    .dot:nth-child(3) { animation-delay: 0.4s }
    @keyframes bounce {
      0%,80%,100% { transform: scale(0.8); opacity: 0.5 }
      40%          { transform: scale(1.2); opacity: 1 }
    }

    .voice-conv-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }

    .voice-conv-btn {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: white;
      border: none;
      border-radius: 50px;
      padding: 14px 28px;
      font-size: 1rem;
      font-weight: 800;
      cursor: pointer;
      min-width: 120px;
      transition: transform 0.15s, box-shadow 0.15s;
      box-shadow: 0 4px 16px rgba(79,70,229,0.35);
    }
    .voice-conv-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(79,70,229,0.45);
    }
    .voice-conv-btn:active { transform: translateY(0) }

    .voice-conv-dismiss {
      background: none;
      border: none;
      color: #9ca3af;
      font-size: 0.85rem;
      cursor: pointer;
      padding: 4px 8px;
    }
    .voice-conv-dismiss:hover { color: #6b7280 }
  `]
})
export class VoiceConversationComponent {
  conv = inject(VoiceConversationService);
}
