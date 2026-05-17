import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { DonationService } from '../../../services/donation/donation.service';

@Component({
  selector: 'app-donation-success',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="result-page">
      <div class="result-card">
        <div class="icon-wrapper success">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        
        <h1 *ngIf="!verified && !error">Verifying payment...</h1>
        <h1 *ngIf="verified">Payment Successful!</h1>
        <h1 *ngIf="error" class="text-danger">Verification Error</h1>

        <div *ngIf="verified">
          <p class="result-text">Thank you for your generosity! Your donation has been successfully recorded.</p>
          <div class="result-actions">
            <a routerLink="/donations" class="btn btn-primary">Back to campaigns</a>
          </div>
        </div>
        
        <div *ngIf="error">
          <p class="result-text">{{ errorMsg }}</p>
          <button class="btn btn-outline-danger" (click)="retry()">Retry</button>
        </div>

        <!-- Loader -->
        <div class="spinner-border text-primary mt-4" role="status" *ngIf="!verified && !error">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
    
    :host {
      display: block;
      font-family: 'Quicksand', sans-serif;
      background: #f8f9fa;
      min-height: 100vh;
      padding-top: 80px;
    }
    
    .result-page {
      display: flex;
      justify-content: center;
      padding: 0 20px;
    }
    
    .result-card {
      background: white;
      border-radius: 20px;
      padding: 50px 40px;
      text-align: center;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 10px 40px rgba(128, 0, 128, 0.08);
      border: 1px solid #e0c8e0;
    }

    .icon-wrapper {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    
    .icon-wrapper.success {
      background: #dcfce7;
      color: #10b981;
    }
    
    .icon-wrapper svg {
      width: 40px;
      height: 40px;
    }

    h1 {
      font-weight: 800;
      color: #2e152e;
      margin-bottom: 12px;
      font-size: 1.8rem;
    }

    .result-text {
      color: #6b3e6b;
      font-size: 1.05rem;
      line-height: 1.6;
      margin-bottom: 30px;
    }

    .btn-primary {
      background: #800080;
      border: none;
      padding: 12px 30px;
      border-radius: 50px;
      font-weight: 700;
      transition: all 0.2s;
    }
    
    .btn-primary:hover {
      background: #660066;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(128,0,128,0.2);
    }
  `]
})
export class DonationSuccessComponent implements OnInit {

  verified = false;
  error = false;
  errorMsg = '';
  sessionId = '';

  constructor(
    private route: ActivatedRoute,
    private donationService: DonationService,
    private router: Router
  ) {}

  ngOnInit() {
    this.sessionId = this.route.snapshot.queryParamMap.get('session_id') || '';
    if (this.sessionId) {
      this.verify();
    } else {
      this.error = true;
      this.errorMsg = 'Payment session not found.';
    }
  }

  verify() {
    this.donationService.verifyCheckoutSession(this.sessionId).subscribe({
      next: () => {
        this.verified = true;
      },
      error: () => {
        this.error = true;
        this.errorMsg = 'Unable to verify payment with server. If you were charged, status will update automatically.';
      }
    });
  }

  retry() {
    this.error = false;
    this.verify();
  }
}

