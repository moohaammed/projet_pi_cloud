import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DonationService } from '../../../services/donation/donation.service';
import { DonationCampaign, Donation } from '../../../models/donation/donation.model';
import { Chart, registerables } from 'chart.js';

@Component({
  selector: 'app-admin-donation',
  templateUrl: './admin-donation.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .admin-donation { font-family: 'Quicksand', sans-serif; }

    .page-top { margin-bottom: 28px; }
    .page-heading {
      font-size: 1.5rem; font-weight: 800; color: #2e152e; margin: 0 0 4px;
    }
    .page-sub { font-size: .88rem; color: #6b3e6b; margin: 0; }

    .stats-row {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 16px; margin-bottom: 28px;
    }
    .stat-card {
      display: flex; align-items: center; gap: 14px;
      background: #fff; border: 1px solid #e0c8e0;
      border-radius: 14px; padding: 18px 20px;
      box-shadow: 0 2px 12px rgba(128,0,128,0.06);
      transition: transform .2s;
    }
    .stat-card:hover { transform: translateY(-2px); }
    .stat-icon {
      width: 48px; height: 48px; border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.2rem;
    }
    .stat-icon.purple { background: #f5e6f5; color: #800080; }
    .stat-icon.green { background: #dcfce7; color: #16a34a; }
    .stat-icon.blue { background: #dbeafe; color: #2563eb; }
    .stat-icon.orange { background: #ffedd5; color: #ea580c; }
    .stat-body { display: flex; flex-direction: column; }
    .stat-value { font-size: 1.3rem; font-weight: 800; color: #2e152e; line-height: 1; }
    .stat-label { font-size: .72rem; color: #6b3e6b; font-weight: 600; margin-top: 2px; }

    .section-card {
      background: #fff; border: 1px solid #e0c8e0;
      border-radius: 14px; margin-bottom: 24px;
      box-shadow: 0 2px 12px rgba(128,0,128,0.06);
      overflow: hidden;
    }
    .section-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px; border-bottom: 1px solid #f0e0f0;
      background: linear-gradient(135deg, rgba(128,0,128,0.03) 0%, transparent 100%);
    }
    .section-header h4 {
      font-size: 1rem; font-weight: 700; color: #2e152e; margin: 0;
    }
    .section-body { padding: 20px; }

    .form-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
    }
    .form-grid .full-width { grid-column: 1 / -1; }
    .form-grid label {
      display: block; font-size: .82rem; font-weight: 700;
      color: #2e152e; margin-bottom: 4px;
    }

    .mini-progress {
      height: 6px; background: #f5e6f5; border-radius: 50px;
      overflow: hidden; width: 80px; display: inline-block;
      vertical-align: middle; margin-right: 6px;
    }
    .mini-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #800080, #a855a8);
      border-radius: 50px; transition: width .4s;
    }

    .table th {
      font-size: .75rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: .05em; color: #6b3e6b; border-bottom: 2px solid #e0c8e0;
      padding: 12px 16px; background: rgba(128,0,128,0.02);
    }
    .table td {
      padding: 12px 16px; font-size: .85rem; vertical-align: middle;
      border-bottom: 1px solid #f0e0f0;
    }
    .table tr:hover td { background: rgba(128,0,128,0.02); }

    @media (max-width: 900px) {
      .stats-row { grid-template-columns: repeat(2, 1fr); }
      .form-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 640px) {
      .stats-row { grid-template-columns: 1fr; }
    }
  `]
})
export class AdminDonationComponent implements OnInit, AfterViewInit {

  campaigns: DonationCampaign[] = [];
  allDonations: Donation[] = [];
  campaignDonations: Donation[] = [];
  selectedCampaign: DonationCampaign | null = null;
  chart: any;

  isEditing = false;
  selectedFile: File | null = null;
  errors: { [key: string]: string } = {};

  newCampaign: DonationCampaign = {
    title: '',
    description: '',
    goalAmount: 0,
    active: true
  };

  constructor(private donationService: DonationService) {
    Chart.register(...registerables);
  }

  ngOnInit() { this.loadAll(); }

  ngAfterViewInit() {
    this.updateChart();
  }

  loadAll() {
    this.donationService.getAllCampaigns().subscribe(data => {
      this.campaigns = data;
      this.updateChart();
    });
    this.donationService.getAllDonations().subscribe(data => this.allDonations = data);
  }

  updateChart() {
    if (this.campaigns.length === 0) return;
    
    // We defer to let the view render
    setTimeout(() => {
      const canvas = document.getElementById('donationChart') as HTMLCanvasElement;
      if (!canvas) return;

      if (this.chart) {
        this.chart.destroy();
      }

      const labels = this.campaigns.map(c => c.title);
      const data = this.campaigns.map(c => c.currentAmount || 0);

      this.chart = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Montant Collecté (DT)',
            data: data,
            backgroundColor: 'rgba(128, 0, 128, 0.6)',
            borderColor: 'rgba(128, 0, 128, 1)',
            borderWidth: 1,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { beginAtZero: true } }
        }
      });
    }, 100);
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files?.[0] ?? null;
  }

  validate(): boolean {
    this.errors = {};
    if (!this.newCampaign.title?.trim()) {
      this.errors['title'] = 'Le titre est obligatoire.';
    }
    if (!this.newCampaign.goalAmount || this.newCampaign.goalAmount <= 0) {
      this.errors['goalAmount'] = 'L\'objectif doit être supérieur à 0.';
    }
    return Object.keys(this.errors).length === 0;
  }

  saveCampaign() {
    if (!this.validate()) return;

    if (this.isEditing && this.selectedCampaign?.id) {
      this.donationService.updateCampaign(this.selectedCampaign.id, this.newCampaign)
        .subscribe(updated => {
          if (this.selectedFile) {
            this.donationService.uploadCampaignImage(updated.id!, this.selectedFile)
              .subscribe(() => this.loadAll());
          } else {
            this.loadAll();
          }
          this.resetForm();
        });
    } else {
      this.donationService.createCampaign(this.newCampaign)
        .subscribe(created => {
          if (this.selectedFile) {
            this.donationService.uploadCampaignImage(created.id!, this.selectedFile)
              .subscribe(() => this.loadAll());
          } else {
            this.loadAll();
          }
          this.resetForm();
        });
    }
  }

  editCampaign(campaign: DonationCampaign) {
    this.selectedCampaign = campaign;
    this.newCampaign = { ...campaign };
    this.isEditing = true;
    this.errors = {};
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteCampaign(id: number) {
    if (confirm('Supprimer cette campagne et tous ses dons associés ?')) {
      this.donationService.deleteCampaign(id).subscribe(() => this.loadAll());
    }
  }

  viewDonations(campaign: DonationCampaign) {
    this.selectedCampaign = campaign;
    this.donationService.getDonationsByCampaign(campaign.id!).subscribe(data => {
      this.campaignDonations = data;
    });
  }

  deleteDonation(id: number) {
    if (confirm('Supprimer ce don ?')) {
      this.donationService.deleteDonation(id).subscribe(() => {
        if (this.selectedCampaign) {
          this.viewDonations(this.selectedCampaign);
        }
        this.loadAll();
      });
    }
  }

  resetForm() {
    this.newCampaign = { title: '', description: '', goalAmount: 0, active: true };
    this.selectedFile = null;
    this.isEditing = false;
    this.selectedCampaign = null;
    this.errors = {};
  }

  getImageUrl(imageUrl?: string): string {
    if (!imageUrl) return '';
    return 'http://localhost:8080' + imageUrl;
  }

  getProgress(c: DonationCampaign): number {
    if (!c.goalAmount || c.goalAmount === 0) return 0;
    return Math.min(((c.currentAmount || 0) / c.goalAmount) * 100, 100);
  }

  getTotalRaised(): number {
    return this.campaigns.reduce((sum, c) => sum + (c.currentAmount || 0), 0);
  }

  getActiveCampaignCount(): number {
    return this.campaigns.filter(c => c.active).length;
  }
}
