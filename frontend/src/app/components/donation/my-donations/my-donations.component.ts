import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DonationService } from '../../../services/donation/donation.service';
import { AuthService } from '../../../services/auth.service';
import { Donation, DonationCampaign } from '../../../models/donation/donation.model';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-my-donations',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="my-donations-page bg-light min-vh-100 py-5" style="font-family: 'Plus Jakarta Sans', sans-serif;">
      <div class="container">
        
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2 class="fw-bold" style="color: #2e152e;">
            <i class="fa-solid fa-hand-holding-heart me-2 text-primary"></i>Mes Dons
          </h2>
          <a routerLink="/donations" class="btn btn-outline-primary rounded-pill fw-bold">Parcourir les campagnes</a>
        </div>

        <!-- Summary Cards -->
        <div class="row g-3 mb-4">
          <div class="col-md-4">
            <div class="card border-0 shadow-sm rounded-4 h-100">
              <div class="card-body p-4 d-flex align-items-center">
                <div class="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 50px; height: 50px;">
                  <i class="fa-solid fa-coins fs-4 text-primary"></i>
                </div>
                <div>
                  <p class="text-muted small mb-0 fw-semibold">Total Donné (Complété)</p>
                  <h3 class="fw-bold text-dark mb-0">{{ totalDonated | number:'1.2-2' }} <span class="fs-6">DT</span></h3>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card border-0 shadow-sm rounded-4 h-100">
              <div class="card-body p-4 d-flex align-items-center">
                <div class="bg-success bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 50px; height: 50px;">
                  <i class="fa-solid fa-check fs-4 text-success"></i>
                </div>
                <div>
                  <p class="text-muted small mb-0 fw-semibold">Dons Réussis</p>
                  <h3 class="fw-bold text-dark mb-0">{{ completedCount }}</h3>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card border-0 shadow-sm rounded-4 h-100">
              <div class="card-body p-4 d-flex align-items-center">
                <div class="bg-warning bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 50px; height: 50px;">
                  <i class="fa-solid fa-clock fs-4 text-warning"></i>
                </div>
                <div>
                  <p class="text-muted small mb-0 fw-semibold">Dons en attente</p>
                  <h3 class="fw-bold text-dark mb-0">{{ pendingCount }}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Donations Table -->
        <div class="card border-0 shadow-sm rounded-4">
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0 custom-table">
                <thead class="bg-light text-muted small text-uppercase">
                  <tr>
                    <th class="ps-4 py-3 rounded-top-start">Campagne</th>
                    <th class="py-3">Date</th>
                    <th class="py-3">Méthode</th>
                    <th class="py-3">Montant</th>
                    <th class="pe-4 py-3 rounded-top-end">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let don of myDonations">
                    <td class="ps-4 py-4">
                      <div class="fw-semibold text-dark">{{ getCampaignTitle(don.campaignId) }}</div>
                      <div class="text-muted small" *ngIf="don.message">
                        <i class="fa-solid fa-quote-left me-1"></i>{{ don.message.substring(0,30) }}{{ don.message.length > 30 ? '...' : '' }}
                      </div>
                    </td>
                    <td class="py-4">
                      <div class="fw-medium text-dark">{{ don.createdAt | date:'shortDate' }}</div>
                      <div class="text-muted small">{{ don.createdAt | date:'shortTime' }}</div>
                    </td>
                    <td class="py-4">
                      <span class="badge bg-light text-dark border">
                        <i class="fa-solid" [class.fa-credit-card]="don.paymentMethod === 'ONLINE'" [class.fa-building-columns]="don.paymentMethod === 'OFFLINE'"></i>
                        {{ don.paymentMethod }}
                      </span>
                    </td>
                    <td class="py-4 fw-bold" style="color: #800080;">
                      {{ don.amount | number:'1.2-2' }} DT
                    </td>
                    <td class="pe-4 py-4">
                      <span class="badge rounded-pill px-3 py-2 fw-medium"
                            [ngClass]="{
                              'bg-success bg-opacity-10 text-success border border-success': don.status === 'COMPLETED' || don.status == null,
                              'bg-warning bg-opacity-10 text-warning border border-warning': don.status === 'PENDING',
                              'bg-danger bg-opacity-10 text-danger border border-danger': don.status === 'FAILED'
                            }">
                        <!-- Icon mapping -->
                        <i class="fa-solid me-1" 
                           [class.fa-check-circle]="don.status === 'COMPLETED' || don.status == null"
                           [class.fa-clock]="don.status === 'PENDING'"
                           [class.fa-times-circle]="don.status === 'FAILED'"></i>
                        {{ don.status || 'COMPLETED' }}
                      </span>
                    </td>
                  </tr>
                  <!-- Empty State -->
                  <tr *ngIf="myDonations.length === 0 && !loading">
                    <td colspan="5" class="text-center py-5">
                      <div class="empty-state">
                        <div class="icon-circle bg-light text-muted mx-auto mb-3" style="width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                          <i class="fa-solid fa-box-open fs-2"></i>
                        </div>
                        <h5 class="fw-bold text-dark">Aucun don trouvé</h5>
                        <p class="text-muted mb-4">Vous n'avez pas encore effectué de don via votre compte.</p>
                        <a routerLink="/donations" class="btn btn-primary rounded-pill px-4">Faire un don maintenant</a>
                      </div>
                    </td>
                  </tr>
                  <tr *ngIf="loading">
                    <td colspan="5" class="text-center py-5">
                      <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Chargement...</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  `,
  styles: [`
    .custom-table th { letter-spacing: 0.5px; border-bottom: 2px solid #f0f0f0; }
    .custom-table td { border-bottom: 1px solid #f8f9fa; }
    .custom-table tr:hover td { background-color: #fdf5fd; }
  `]
})
export class MyDonationsComponent implements OnInit {

  myDonations: Donation[] = [];
  campaignsList: DonationCampaign[] = [];
  loading = true;

  totalDonated = 0;
  completedCount = 0;
  pendingCount = 0;

  constructor(
    private donationService: DonationService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    const userId = this.auth.getCurrentUser()?.id;
    
    if (userId) {
      forkJoin({
        donations: this.donationService.getDonationsByUser(userId),
        campaigns: this.donationService.getAllCampaigns()
      }).subscribe({
        next: (res) => {
          this.campaignsList = res.campaigns;
          // Sort donations newer first
          this.myDonations = res.donations.sort((a,b) => {
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
          });
          
          this.calculateStats();
          this.loading = false;
        },
        error: () => this.loading = false
      });
    } else {
      this.loading = false; // Not logged in
    }
  }

  calculateStats() {
    this.completedCount = this.myDonations.filter(d => d.status === 'COMPLETED' || d.status == null).length;
    this.pendingCount = this.myDonations.filter(d => d.status === 'PENDING').length;
    
    this.totalDonated = this.myDonations
      .filter(d => d.status === 'COMPLETED' || d.status == null)
      .reduce((sum, d) => sum + (d.amount || 0), 0);
  }

  getCampaignTitle(campaignId?: number): string {
    if (!campaignId) return 'Campagne inconnue';
    const c = this.campaignsList.find(c => c.id === campaignId);
    return c ? (c.title || 'Inconnue') : `Campagne (#${campaignId})`;
  }
}
