import { Component, OnDestroy, OnInit, inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  AdminCollaborationService,
  ChatGroupAdmin,
  DirectMessageMetadata,
  ModerationQueueItem,
  SafetyAlertLogRow,
  SystemHealthKpis
} from '../../../services/collaboration/admin-collaboration.service';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

import { FormsModule } from '@angular/forms';

import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-admin-collaboration-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-collaboration-dashboard.component.html',
  styleUrl: './admin-collaboration-dashboard.component.scss'
})
export class AdminCollaborationDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  public readonly auth = inject(AuthService);
  private readonly adminApi = inject(AdminCollaborationService);

  @ViewChild('complianceCanvas') complianceCanvas?: ElementRef<HTMLCanvasElement>;

  kpis: SystemHealthKpis = { unresolvedSafetyAlerts: 0, pendingModeration: 0 };
  safetyLogs: SafetyAlertLogRow[] = [];
  moderation: ModerationQueueItem[] = [];
  dmMeta: DirectMessageMetadata[] = [];
  groups: ChatGroupAdmin[] = [];
  
  // Community Manager State
  currentView: 'health' | 'groups' | 'moderation' | 'announcements' = 'health';
  dropdownOpen = false;
  announcementText = '';
  searchUserId?: number;
  searchResultGroups: ChatGroupAdmin[] = [];
  editingGroup: ChatGroupAdmin | null = null;

  error = '';
  loading = true;

  private pendingCalls = 0;
  private chart: Chart | null = null;

  ngOnInit(): void {
    Chart.register(...registerables);
    this.reload();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.loadChart(), 0);
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  reload(): void {
    this.loading = true;
    this.error = '';
    this.pendingCalls = 3;

    const done = () => {
      this.pendingCalls--;
      if (this.pendingCalls <= 0) {
        this.loading = false;
        setTimeout(() => this.loadChart(), 0);
      }
    };

    this.adminApi.getKpis().subscribe({
      next: (k) => (this.kpis = k),
      error: (e) => { this.fail(e); done(); },
      complete: () => done()
    });
    this.adminApi.getSafetyLogs().subscribe({
      next: (r) => (this.safetyLogs = r),
      error: (e) => { this.fail(e); done(); },
      complete: () => done()
    });
    this.adminApi.getModerationQueue().subscribe({
      next: (r) => (this.moderation = r),
      error: (e) => { this.fail(e); done(); },
      complete: () => done()
    });
    this.adminApi.getDirectMessageMetadata().subscribe({
      next: (r) => (this.dmMeta = r),
      error: (e) => this.fail(e)
    });
  }

  private fail(e: unknown): void {
    const err = e as { error?: { message?: string }; message?: string };
    this.error = err?.error?.message || err?.message || 'Request failed';
  }

  safetyStatusLabel(status: string): string {
    switch (status) {
      case 'CAREGIVERS_NOTIFIED':
        return 'Family Notified';
      case 'OPEN':
        return 'Open';
      case 'RESOLVED':
        return 'Resolved';
      case 'DISMISSED':
        return 'Dismissed';
      default:
        return status;
    }
  }

  alertTypeLabel(t: string): string {
    switch (t) {
      case 'DISORIENTATION':
        return 'Disorientation';
      case 'HIGH_DISTRESS_SIGNAL':
        return 'High distress';
      default:
        return t;
    }
  }

  dismiss(pubId: number): void {
    this.adminApi.dismissFlag(pubId).subscribe({ next: () => this.reload(), error: (e) => this.fail(e) });
  }

  deletePost(pubId: number): void {
    if (!confirm('Delete this post permanently?')) return;
    this.adminApi.deletePost(pubId).subscribe({ next: () => this.reload(), error: (e) => this.fail(e) });
  }

  suspendUser(userId: number): void {
    if (!confirm('Suspend this user? They will not be able to sign in.')) return;
    this.adminApi.suspendUser(userId).subscribe({ next: () => this.reload(), error: (e) => this.fail(e) });
  }

  scanHistory(): void {
    if (!confirm('Scan the last 30 days of message history for undetected incidents?')) return;
    this.adminApi.retroactiveScan().subscribe({
      next: () => {
        alert('History scan complete. Dashboard updated.');
        this.reload();
      },
      error: (e) => this.fail(e)
    });
  }

  // --- Community Manager Actions ---


  switchView(v: 'health' | 'groups' | 'moderation' | 'announcements'): void {
    this.currentView = v;
    this.error = '';
    if (v === 'groups') this.loadGroups();
    if (v === 'moderation') this.reload(); 
    if (v === 'health') setTimeout(() => this.loadChart(), 0);
  }

  viewLabel(v: string): string {
    switch (v) {
      case 'health': return 'Health Dashboard';
      case 'groups': return 'Community Groups';
      case 'moderation': return 'Moderation Queue';
      case 'announcements': return 'Announcement Form';
      case 'search': return 'Member Lookup';
      default: return v;
    }
  }

  getCategoryBadgeClass(category: string): string {
    switch (category) {
      case 'PATIENTS': return 'bg-soft-primary text-primary';
      case 'FAMILY': return 'bg-soft-success text-success';
      case 'PROFESSIONAL': return 'bg-soft-info text-info';
      case 'MIXED': return 'bg-soft-warning text-warning';
      default: return 'bg-soft-secondary text-secondary';
    }
  }

  loadGroups(): void {
    this.loading = true;
    this.adminApi.getAllGroups().subscribe({
      next: (g) => { this.groups = g; this.loading = false; },
      error: (e) => this.fail(e)
    });
  }

  deleteGroup(id: number): void {
    if (!confirm('Archive/Delete this community permanently?')) return;
    this.adminApi.deleteGroup(id).subscribe({
      next: () => this.loadGroups(),
      error: (e) => this.fail(e)
    });
  }

  startEdit(g: ChatGroupAdmin): void {
    this.editingGroup = { ...g };
  }

  cancelEdit(): void {
    this.editingGroup = null;
  }

  saveEdit(): void {
    if (!this.editingGroup) return;
    this.adminApi.updateGroup(this.editingGroup.id, this.editingGroup).subscribe({
      next: () => {
        this.editingGroup = null;
        this.loadGroups();
      },
      error: (e) => this.fail(e)
    });
  }

  sendAnnouncement(): void {
    if (!this.announcementText.trim()) return;
    this.adminApi.postAnnouncement(this.announcementText).subscribe({
      next: () => {
        alert('Global announcement broadcasted successfully.');
        this.announcementText = '';
      },
      error: (e) => this.fail(e)
    });
  }

  doSearch(): void {
    if (!this.searchUserId) return;
    this.loading = true;
    this.adminApi.getUserGroups(this.searchUserId).subscribe({
      next: (res) => {
        this.searchResultGroups = res;
        this.loading = false;
      },
      error: (e) => this.fail(e)
    });
  }

  approvePost(id: number): void {
    this.adminApi.approvePost(id).subscribe({
      next: () => this.reload(),
      error: (e) => this.fail(e)
    });
  }

  banUser(userId: number): void {
    if (!confirm('Ban this user from the platform?')) return;
    this.adminApi.banUser(userId).subscribe({
      next: () => this.reload(),
      error: (e) => this.fail(e)
    });
  }

  private loadChart(): void {
    this.adminApi.getStressTrend(7).subscribe({
      next: (t) => {
        const canvas = this.complianceCanvas?.nativeElement;
        if (!canvas) return;
        this.chart?.destroy();
        const cfg: ChartConfiguration = {
          type: 'bar',
          data: {
            labels: t.labels,
            datasets: [
              {
                label: 'Total Activity',
                data: t.totalActivitySeries,
                backgroundColor: '#0d6efd', // Blue
                borderRadius: 4
              },
              {
                label: 'Agitation / Negative Tone',
                data: t.negativeSentimentSeries,
                backgroundColor: '#ff9800', // Orange
                borderRadius: 4
              },
              {
                label: 'Critical Safety Alerts',
                data: t.criticalAlertSeries,
                backgroundColor: '#f44336', // Red
                borderRadius: 4
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { stacked: true },
              y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } }
            },
            plugins: {
              legend: { display: true, position: 'top' },
              tooltip: { mode: 'index', intersect: false }
            }
          }
        };
        this.chart = new Chart(canvas, cfg);
      },
      error: (e) => this.fail(e)
    });
  }
}
