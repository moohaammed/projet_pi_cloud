import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-donation-cancel',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="result-page">
      <div class="result-card">
        <div class="icon-wrapper cancel">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </div>
        
        <h1>Paiement Annulé</h1>
        <p class="result-text">Vous avez annulé le processus de paiement. Aucun montant n'a été débité.</p>
        
        <div class="result-actions">
          <a routerLink="/donations" class="btn btn-outline-primary">Retour aux campagnes</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
    
    :host {
      display: block;
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: #fdf5fd;
      min-height: 100vh;
      padding-top: 80px;
    }
    
    .result-page { display: flex; justify-content: center; padding: 0 20px; }
    
    .result-card {
      background: white; border-radius: 20px; padding: 50px 40px;
      text-align: center; max-width: 500px; width: 100%;
      box-shadow: 0 10px 40px rgba(128, 0, 128, 0.08);
      border: 1px solid #e0c8e0;
    }

    .icon-wrapper {
      width: 80px; height: 80px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 24px;
    }
    
    .icon-wrapper.cancel { background: #fee2e2; color: #ef4444; }
    .icon-wrapper svg { width: 40px; height: 40px; }

    h1 { font-weight: 800; color: #2e152e; margin-bottom: 12px; font-size: 1.8rem; }
    .result-text { color: #6b3e6b; font-size: 1.05rem; line-height: 1.6; margin-bottom: 30px; }

    .btn-outline-primary {
      background: transparent; color: #800080; border: 2px solid #800080;
      padding: 12px 30px; border-radius: 50px; font-weight: 700;
      transition: all 0.2s; text-decoration: none; display: inline-block;
    }
    .btn-outline-primary:hover {
      background: #fdf5fd; transform: translateY(-2px);
    }
  `]
})
export class DonationCancelComponent {}
