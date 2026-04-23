import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DonationCampaign, Donation } from '../../models/donation/donation.model';

@Injectable({ providedIn: 'root' })
export class DonationService {

  private campaignApi = 'http://localhost:8080/api/campaigns';
  private donationApi = 'http://localhost:8080/api/donations';

  constructor(private http: HttpClient) {}

  // ── Campaigns ──────────────────────────────────

  getAllCampaigns(): Observable<DonationCampaign[]> {
    return this.http.get<DonationCampaign[]>(this.campaignApi);
  }

  getActiveCampaigns(): Observable<DonationCampaign[]> {
    return this.http.get<DonationCampaign[]>(`${this.campaignApi}/active`);
  }

  getCampaignById(id: string): Observable<DonationCampaign> {
    return this.http.get<DonationCampaign>(`${this.campaignApi}/${id}`);
  }

  createCampaign(campaign: DonationCampaign): Observable<DonationCampaign> {
    return this.http.post<DonationCampaign>(this.campaignApi, campaign);
  }

  updateCampaign(id: string, campaign: DonationCampaign): Observable<DonationCampaign> {
    return this.http.put<DonationCampaign>(`${this.campaignApi}/${id}`, campaign);
  }

  deleteCampaign(id: string): Observable<void> {
    return this.http.delete<void>(`${this.campaignApi}/${id}`);
  }

  uploadCampaignImage(campaignId: string, file: File): Observable<DonationCampaign> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<DonationCampaign>(`${this.campaignApi}/${campaignId}/image`, formData);
  }

  // ── Donations ──────────────────────────────────

  getAllDonations(): Observable<Donation[]> {
    return this.http.get<Donation[]>(this.donationApi);
  }

  getDonationById(id: string): Observable<Donation> {
    return this.http.get<Donation>(`${this.donationApi}/${id}`);
  }

  getDonationsByCampaign(campaignId: string): Observable<Donation[]> {
    return this.http.get<Donation[]>(`${this.donationApi}/campaign/${campaignId}`);
  }

  getDonationsByUser(userId: number): Observable<Donation[]> {
    return this.http.get<Donation[]>(`${this.donationApi}/user/${userId}`);
  }

  getDonationsByEmail(email: string): Observable<Donation[]> {
    return this.http.get<Donation[]>(`${this.donationApi}/email/${email}`);
  }

  createDonation(donation: Donation): Observable<Donation> {
    return this.http.post<Donation>(this.donationApi, donation);
  }

  createCheckoutSession(donation: Donation): Observable<{sessionId: string, url: string}> {
    return this.http.post<{sessionId: string, url: string}>(`${this.donationApi}/checkout`, donation);
  }

  verifyCheckoutSession(sessionId: string): Observable<Donation> {
    return this.http.post<Donation>(`${this.donationApi}/verify`, { sessionId });
  }

  deleteDonation(id: string): Observable<void> {
    return this.http.delete<void>(`${this.donationApi}/${id}`);
  }

  // ── AI Analysis ────────────────────────────────
  analyzeCampaign(id: string): Observable<any> {
    return this.http.get<any>(`http://localhost:8080/api/ai/analyze-campaign/${id}`);
  }
}
