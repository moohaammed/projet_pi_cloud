import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccessibilityService } from '../../services/accessibility.service';

@Component({
  selector: 'app-accessibility-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="accessibility-controls-container">
      <button class="btn-floating-accessibility" (click)="toggleMenu()">
        <span>👁</span>
        <span *ngIf="!collapsed"> Mode Accessibilité</span>
      </button>

      <div class="accessibility-menu shadow-lg" [class.show]="showMenu">
        <div class="p-3">
          <h6 class="mb-3 fw-bold">Paramètres d'accessibilité</h6>
          
          <div class="form-check form-switch mb-3">
            <input class="form-check-input" type="checkbox" id="simpleModeSwitch" 
                   [checked]="accService.simplifiedMode()" (change)="accService.toggleSimplifiedMode()">
            <label class="form-check-label fw-medium" for="simpleModeSwitch">
              {{ accService.simplifiedMode() ? 'Désactiver Mode Simplifié' : 'Activer Mode Simplifié' }}
            </label>
          </div>

          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" id="highContrastSwitch"
                   [checked]="accService.highContrast()" (change)="accService.toggleHighContrast()">
            <label class="form-check-label fw-medium" for="highContrastSwitch">
              🌙 Contraste élevé
            </label>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .accessibility-controls-container {
      position: fixed;
      top: 100px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .btn-floating-accessibility {
      background-color: #008080;
      color: white;
      border: none;
      border-radius: 50px;
      padding: 12px 20px;
      font-weight: 600;
      box-shadow: 0 4px 15px rgba(0, 128, 128, 0.3);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .btn-floating-accessibility:hover {
      transform: scale(1.05);
      background-color: #006666;
    }

    .accessibility-menu {
      position: absolute;
      top: 60px;
      right: 0;
      width: 250px;
      background: white;
      border-radius: 12px;
      display: none;
      border: 1px solid rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .accessibility-menu.show {
      display: block;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .form-check-input:checked {
      background-color: #008080;
      border-color: #008080;
    }
  `]
})
export class AccessibilityToggleComponent {
  showMenu = false;
  collapsed = false;

  constructor(public accService: AccessibilityService) {}

  toggleMenu() {
    this.showMenu = !this.showMenu;
  }
}
