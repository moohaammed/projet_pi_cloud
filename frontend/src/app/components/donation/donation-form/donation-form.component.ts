import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DonationService } from '../../../services/donation/donation.service';
import { DonationCampaign, Donation } from '../../../models/donation/donation.model';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-donation-form',
  templateUrl: './donation-form.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Fraunces:wght@700;800&display=swap');

    :host {
      --primary:      #800080;
      --primary-light:#f5e6f5;
      --primary-mid:  #e8c8e8;
      --primary-hover:#660066;
      --primary-dark: #4d004d;
      --white:        #ffffff;
      --card-bg:      #ffffff;
      --border:       #e0c8e0;
      --text-dark:    #2e152e;
      --text-mid:     #6b3e6b;
      --text-light:   #b07ab0;
      --success:      #10b981;
      --error:        #ef4444;
      --shadow:       0 2px 16px rgba(128, 0, 128, 0.08);
      --shadow-card:  0 4px 24px rgba(128, 0, 128, 0.10);
      --radius:       16px;
      display: block;
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: #ffffff !important;
    }

    .donation-form-page {
      background: #ffffff !important;
      min-height: 100vh;
      padding: 20px 32px 40px;
    }

    .page-header {
      position: relative;
      background: linear-gradient(135deg, rgba(128,0,128,0.06) 0%, rgba(128,0,128,0.01) 100%) !important;
      border: 1px solid rgba(128,0,128,0.08);
      border-radius: var(--radius);
      padding: 45px 30px !important;
      margin-bottom: 28px;
      text-align: center;
      overflow: hidden;
    }
    .page-header::before {
      content: '';
      position: absolute;
      top: -50px; left: -50px;
      width: 150px; height: 150px;
      background: var(--primary-light);
      filter: blur(40px);
      border-radius: 50%;
      opacity: 0.6;
    }

    .title-container {
      position: relative; z-index: 1;
      display: flex; flex-direction: column; align-items: center; gap: 12px;
    }
    .header-badge {
      display: inline-block; padding: 6px 14px;
      background: var(--white); color: var(--primary-dark);
      font-size: 0.75rem; font-weight: 700;
      letter-spacing: 0.05em; text-transform: uppercase;
      border-radius: 50px; border: 1px solid var(--primary-light);
    }
    .page-title {
      font-family: 'Fraunces', serif; font-size: 2.8rem; font-weight: 800;
      color: var(--text-dark);
      background: linear-gradient(to right, var(--text-dark), var(--primary));
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      margin: 0; line-height: 1.1;
    }
    .highlight { color: var(--primary); -webkit-text-fill-color: var(--primary); }
    .page-subtitle { font-size: 1.05rem; color: var(--text-mid); margin: 0; max-width: 550px; }

    .form-layout {
      display: grid;
      grid-template-columns: 340px 1fr;
      gap: 28px;
      align-items: start;
    }

    /* SIDEBAR */
    .sidebar { display: flex; flex-direction: column; gap: 20px; }

    .campaign-preview, .my-donations-card {
      background: var(--card-bg);
      border: 1.5px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
      box-shadow: var(--shadow-card);
    }

    .preview-image {
      height: 180px; border-radius: 12px; overflow: hidden;
      margin-bottom: 16px; background: var(--primary-mid);
    }
    .preview-image img { width: 100%; height: 100%; object-fit: cover; }

    .preview-title {
      font-family: 'Fraunces', serif; font-size: 1.1rem; font-weight: 700;
      color: var(--text-dark); margin: 0 0 8px;
    }
    .preview-desc {
      font-size: .82rem; color: var(--text-mid); line-height: 1.5; margin: 0 0 14px;
    }

    .progress-section { display: flex; flex-direction: column; gap: 6px; }
    .progress-header {
      display: flex; justify-content: space-between; font-size: .75rem; color: var(--text-mid);
    }
    .progress-raised strong { color: var(--success); font-size: .85rem; }
    .progress-goal { font-size: .7rem; color: var(--text-light); }
    .progress-bar-track {
      height: 8px; background: var(--primary-light); border-radius: 50px; overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--primary), #a855a8);
      border-radius: 50px; transition: width 0.6s ease; min-width: 2%;
    }
    .progress-percent {
      font-size: .68rem; font-weight: 700; color: var(--primary); align-self: flex-end;
    }

    .section-title {
      font-family: 'Fraunces', serif; font-size: 1.05rem; font-weight: 700;
      color: var(--text-dark); margin: 0 0 8px;
    }
    .section-desc { font-size: .82rem; color: var(--text-mid); margin: 0 0 12px; }

    .lookup-form { display: flex; gap: 8px; }
    .lookup-form .form-input { flex: 1; font-size: .82rem; }
    .btn-lookup {
      padding: 10px 16px; background: var(--primary); color: var(--white);
      border: none; border-radius: 10px; font-weight: 700; font-size: .78rem;
      cursor: pointer; transition: all .2s; white-space: nowrap;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    .btn-lookup:hover { background: var(--primary-hover); }

    .lookup-results { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
    .lookup-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 12px; background: var(--primary-light); border-radius: 8px;
      font-size: .78rem;
    }
    .lookup-amount { font-weight: 700; color: var(--success); }
    .lookup-date { color: var(--text-mid); }

    /* MAIN FORM */
    .main-form { display: flex; flex-direction: column; gap: 24px; }

    .success-banner {
      display: flex; align-items: center; gap: 14px;
      padding: 16px 20px; background: #dcfce7; border: 1.5px solid #86efac;
      border-radius: var(--radius); animation: slideDown .4s ease;
    }
    .success-banner svg { width: 36px; height: 36px; color: var(--success); flex-shrink: 0; }
    .success-banner strong { color: #166534; font-size: .95rem; }
    .success-banner p { color: #15803d; font-size: .82rem; margin: 2px 0 0; }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .form-section {
      background: var(--card-bg); border: 1.5px solid var(--border);
      border-radius: var(--radius); padding: 24px; box-shadow: var(--shadow-card);
    }

    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

    .form-group { margin-bottom: 14px; }
    .form-label {
      display: block; font-size: .82rem; font-weight: 600; color: var(--text-dark);
      margin-bottom: 6px;
    }
    .form-label.required::after {
      content: ' *'; color: var(--error); font-weight: 700;
    }

    .form-input {
      width: 100%; padding: 11px 16px;
      border: 1.5px solid var(--border); border-radius: 10px;
      font-family: 'Plus Jakarta Sans', sans-serif; font-size: .88rem;
      color: var(--text-dark); background: var(--white);
      transition: all .2s; outline: none;
      box-sizing: border-box;
    }
    .form-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(128,0,128,0.08); }
    .form-input::placeholder { color: var(--text-light); }
    .form-textarea { resize: vertical; min-height: 80px; }
    .amount-input { font-size: 1.2rem; font-weight: 700; text-align: center; }

    .error-msg {
      font-size: .75rem; color: var(--error); font-weight: 600; margin-top: 4px;
    }

    .amount-presets {
      display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap;
    }
    .preset-btn {
      padding: 10px 20px;
      border: 1.5px solid var(--border); border-radius: 50px;
      background: var(--white); color: var(--text-mid);
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: .85rem; font-weight: 700;
      cursor: pointer; transition: all .2s;
    }
    .preset-btn:hover { border-color: var(--primary); color: var(--primary); }
    .preset-btn.selected {
      background: var(--primary); border-color: var(--primary);
      color: var(--white);
    }

    .payment-options { display: flex; gap: 14px; flex-wrap: wrap; }
    .payment-option {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 20px; border: 1.5px solid var(--border);
      border-radius: 12px; cursor: pointer; transition: all .2s;
      flex: 1; min-width: 180px;
    }
    .payment-option:hover { border-color: var(--primary); }
    .payment-option.selected {
      border-color: var(--primary); background: var(--primary-light);
    }
    .payment-option input { display: none; }
    .payment-option svg { width: 22px; height: 22px; color: var(--primary); }
    .payment-option span { font-size: .88rem; font-weight: 600; color: var(--text-dark); }

    .form-check-row { margin-bottom: 10px; }
    .custom-checkbox {
      display: flex; align-items: center; gap: 10px;
      font-size: .82rem; color: var(--text-mid); cursor: pointer;
    }
    .custom-checkbox input { display: none; }
    .checkmark {
      width: 20px; height: 20px; border: 2px solid var(--border);
      border-radius: 6px; display: flex; align-items: center; justify-content: center;
      transition: all .2s; flex-shrink: 0;
    }
    .custom-checkbox input:checked + .checkmark {
      background: var(--primary); border-color: var(--primary);
    }
    .custom-checkbox input:checked + .checkmark::after {
      content: '✓'; color: white; font-size: .7rem; font-weight: 900;
    }

    .donation-summary {
      background: var(--card-bg); border: 1.5px solid var(--border);
      border-radius: var(--radius); padding: 24px; box-shadow: var(--shadow-card);
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 16px;
    }
    .summary-row { display: flex; align-items: baseline; gap: 10px; }
    .summary-label { font-size: .95rem; color: var(--text-mid); font-weight: 500; }
    .summary-amount {
      font-family: 'Fraunces', serif; font-size: 1.6rem; font-weight: 800;
      color: var(--text-dark);
    }

    .btn-donate {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 14px 32px;
      background: linear-gradient(135deg, var(--primary), #a855a8);
      color: var(--white); border: none; border-radius: 50px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: .95rem; font-weight: 800;
      cursor: pointer; transition: all .25s;
      letter-spacing: 0.02em;
      box-shadow: 0 4px 16px rgba(128,0,128,0.25);
    }
    .btn-donate:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(128,0,128,0.35);
    }
    .btn-donate:disabled { opacity: .6; cursor: not-allowed; }
    .btn-donate svg { width: 18px; height: 18px; }

    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      padding: 90px 20px; gap: 14px; text-align: center;
    }
    .empty-glass {
      width: 100px; height: 100px; border-radius: 30px;
      background: var(--primary-light);
      display: flex; align-items: center; justify-content: center;
    }
    .empty-glass svg { width: 42px; height: 42px; color: var(--primary); }
    .empty-title {
      font-family: 'Fraunces', serif; font-size: 1.2rem; font-weight: 700;
      color: var(--text-dark); margin: 0;
    }

    @media (max-width: 900px) {
      .form-layout { grid-template-columns: 1fr; }
      .sidebar { order: 2; }
      .main-form { order: 1; }
    }
    @media (max-width: 640px) {
      .donation-form-page { padding: 18px 14px 40px; }
      .page-title { font-size: 2rem; }
      .form-row { grid-template-columns: 1fr; }
      .payment-options { flex-direction: column; }
    }
  `]
})
export class DonationFormComponent implements OnInit {

  campaign: DonationCampaign | null = null;
  donation: Donation = {
    amount: 10,
    donorFirstName: '',
    donorLastName: '',
    donorEmail: '',
    donorPhone: '',
    paymentMethod: 'ONLINE',
    anonymous: false,
    message: ''
  };

  presetAmounts = [5, 10, 20, 50, 100];
  agreeTerms = false;
  submitting = false;
  showSuccess = false;
  lastDonationAmount = 0;
  errors: { [key: string]: string } = {};

  lookupEmail = '';
  lookupResults: Donation[] = [];

  constructor(
    private route: ActivatedRoute,
    private donationService: DonationService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    const campaignId = this.route.snapshot.paramMap.get('campaignId');
    if (campaignId) {
      this.donationService.getCampaignById(campaignId).subscribe(c => {
        this.campaign = c;
        this.donation.campaignId = c.id;
      });
    }

    // Pre-fill user info if logged in
    const user = this.auth.getCurrentUser();
    if (user) {
      this.donation.userId = user.id;
      this.donation.donorFirstName = user.prenom || '';
      this.donation.donorLastName = user.nom || '';
      this.donation.donorEmail = user.email || '';
    }
  }

  selectAmount(amount: number) {
    this.donation.amount = amount;
    this.errors['amount'] = '';
  }

  getImageUrl(imageUrl?: string): string {
    if (!imageUrl) return 'template/assets/img/donation.jpg';
    return 'http://localhost:8080' + imageUrl;
  }

  getProgress(): number {
    if (!this.campaign?.goalAmount || this.campaign.goalAmount === 0) return 0;
    return Math.min(((this.campaign.currentAmount || 0) / this.campaign.goalAmount) * 100, 100);
  }

  onImgError(event: any) { event.target.src = 'template/assets/img/donation.jpg'; }

  validate(): boolean {
    this.errors = {};

    if (!this.donation.amount || this.donation.amount <= 0) {
      this.errors['amount'] = 'Le montant doit être supérieur à 0.';
    } else if (this.donation.amount > 100000) {
      this.errors['amount'] = 'Le montant ne peut pas dépasser 100 000 DT.';
    }

    if (!this.donation.donorFirstName?.trim()) {
      this.errors['donorFirstName'] = 'Le prénom est obligatoire.';
    }

    if (!this.donation.donorLastName?.trim()) {
      this.errors['donorLastName'] = 'Le nom est obligatoire.';
    }

    if (!this.donation.donorEmail?.trim()) {
      this.errors['donorEmail'] = 'L\'email est obligatoire.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.donation.donorEmail)) {
        this.errors['donorEmail'] = 'L\'email n\'est pas valide.';
      }
    }

    if (!this.donation.paymentMethod) {
      this.errors['paymentMethod'] = 'Veuillez choisir une méthode de paiement.';
    }

    if (!this.agreeTerms) {
      this.errors['agree'] = 'Vous devez accepter les conditions.';
    }

    return Object.keys(this.errors).length === 0;
  }

  submitDonation() {
    if (!this.validate()) return;
    this.submitting = true;

    if (this.donation.paymentMethod === 'ONLINE') {
      // Redirect to Stripe
      this.donationService.createCheckoutSession(this.donation).subscribe({
        next: (response) => {
          window.location.href = response.url; // Redirect to Stripe hosted checkout
        },
        error: () => {
          this.submitting = false;
          alert('Erreur lors de la communication avec le serveur de paiement. Veuillez réessayer.');
        }
      });
    } else {
      // Offline transaction
      this.donationService.createDonation(this.donation).subscribe({
        next: (saved) => {
          this.lastDonationAmount = saved.amount || 0;
          this.showSuccess = true;
          this.submitting = false;

          if (this.campaign?.id) {
            this.donationService.getCampaignById(this.campaign.id).subscribe(c => {
              this.campaign = c;
            });
          }

          this.donation = {
            ...this.donation,
            amount: 10,
            message: '',
            anonymous: false
          };
          this.agreeTerms = false;

          setTimeout(() => this.showSuccess = false, 8000);
        },
        error: () => {
          this.submitting = false;
          alert('Erreur lors de l\'enregistrement du don. Veuillez réessayer.');
        }
      });
    }
  }

  lookupDonations() {
    if (!this.lookupEmail.trim()) return;
    this.donationService.getDonationsByEmail(this.lookupEmail).subscribe(data => {
      this.lookupResults = data;
    });
  }
}
