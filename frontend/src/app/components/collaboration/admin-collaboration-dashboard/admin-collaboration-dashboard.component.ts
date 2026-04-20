import { Component, OnDestroy, OnInit, inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  AdminCollaborationService,
  ChatGroupAdmin,
  ClinicalPulse,
  ContentItem,
  DirectMessageMetadata,
  ModerationQueueItem,
  SafetyAlertLogRow,
  SystemHealthKpis
} from '../../../services/collaboration/admin-collaboration.service';
import { PublicationDto } from '../../../services/collaboration/publication.service';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

import { FormsModule } from '@angular/forms';

import { AuthService } from '../../../services/auth.service';
import { AlzUserService } from '../../../services/alz-user.service';

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
  private readonly userService = inject(AlzUserService);
  
  Math = Math;

  @ViewChild('complianceCanvas') complianceCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('sentimentCanvas') sentimentCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('activityCanvas') activityCanvas?: ElementRef<HTMLCanvasElement>;

  kpis: SystemHealthKpis = { unresolvedSafetyAlerts: 0, pendingModeration: 0 };
  safetyLogs: SafetyAlertLogRow[] = [];
  moderation: ModerationQueueItem[] = [];
  dmMeta: DirectMessageMetadata[] = [];
  groups: ChatGroupAdmin[] = [];
  defaultGroups: ChatGroupAdmin[] = [];
  
  dmFilterQuery = '';
  dmShowOnlyDistressed = false;
  dmCurrentPage = 1;
  dmPageSize = 10;
  
  get filteredDmMeta(): DirectMessageMetadata[] {
    let list = [...this.dmMeta];
    const query = this.dmFilterQuery.toLowerCase().trim();
    
    if (this.dmShowOnlyDistressed) {
      list = list.filter(dm => dm.distressedMessageCount > 0);
    }
    
    if (query) {
      list = list.filter(dm => {
        const nameA = this.getUserName(dm.userIdA).toLowerCase();
        const nameB = this.getUserName(dm.userIdB).toLowerCase();
        return nameA.includes(query) || nameB.includes(query) ||
               dm.userIdA.toString().includes(query) || dm.userIdB.toString().includes(query);
      });
    }
    
    return list;
  }
  
  get paginatedDmMeta(): DirectMessageMetadata[] {
    const start = (this.dmCurrentPage - 1) * this.dmPageSize;
    return this.filteredDmMeta.slice(start, start + this.dmPageSize);
  }
  
  get dmTotalPages(): number {
    return Math.ceil(this.filteredDmMeta.length / this.dmPageSize);
  }
  
  get dmPageNumbers(): number[] {
    const total = this.dmTotalPages;
    const current = this.dmCurrentPage;
    let start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }
  
  goToPage(page: number): void {
    if (page >= 1 && page <= this.dmTotalPages) this.dmCurrentPage = page;
  }
  
  nextPage(): void {
    if (this.dmCurrentPage < this.dmTotalPages) this.dmCurrentPage++;
  }
  
  prevPage(): void {
    if (this.dmCurrentPage > 1) this.dmCurrentPage--;
  }
  
  clearDmFilters(): void {
    this.dmFilterQuery = '';
    this.dmShowOnlyDistressed = false;
    this.dmCurrentPage = 1;
  }
  
  engagementMix: any = null;
  sentimentDist: any = null;
  aiImpact: any = null;
  clinicalPulse: ClinicalPulse | null = null;

  currentView: 'health' | 'groups' | 'moderation' | 'announcements' | 'ai' | 'content' = 'health';
  announcementText = '';
  announcementTargetGroupId: string | null = null;
  announcementScheduledAt: string = '';
  scheduledAnnouncements: PublicationDto[] = [];
  dropdownOpen = false;
  searchUserId?: number;
  searchResultGroups: ChatGroupAdmin[] = [];
  editingGroup: ChatGroupAdmin | null = null;

  contentPosts: ContentItem[] = [];
  contentMessages: ContentItem[] = [];
  contentTab: 'posts' | 'messages' | 'dms' = 'posts';
  contentSearchQuery = '';
  contentLoading = false;
  contentPage = 1;
  contentPageSize = 8;

  get filteredContentItems(): ContentItem[] {
    const list = this.contentTab === 'posts' ? this.contentPosts :
                 this.contentTab === 'messages' ? this.contentMessages : [];
    if (this.contentSearchQuery === '__distressed__') {
      return list.filter(item => item.distressed);
    }
    const q = this.contentSearchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(item =>
      item.content?.toLowerCase().includes(q) ||
      item.authorName?.toLowerCase().includes(q) ||
      item.groupName?.toLowerCase().includes(q)
    );
  }

  get paginatedContentItems(): ContentItem[] {
    const start = (this.contentPage - 1) * this.contentPageSize;
    return this.filteredContentItems.slice(start, start + this.contentPageSize);
  }

  get contentTotalPages(): number {
    return Math.ceil(this.filteredContentItems.length / this.contentPageSize);
  }

  get contentDistressedCount(): number {
    const list = this.contentTab === 'posts' ? this.contentPosts : this.contentMessages;
    return list.filter(i => i.distressed).length;
  }

  get contentFlaggedCount(): number {
    return this.contentPosts.filter(i => i.moderationStatus === 'PENDING_REVIEW').length;
  }

  get contentTotalDistressed(): number {
    return this.contentPosts.filter(p => p.distressed).length +
           this.contentMessages.filter(m => m.distressed).length;
  }

  onContentTabChange(tab: 'posts' | 'messages' | 'dms'): void {
    this.contentTab = tab;
    this.contentPage = 1;
    this.contentSearchQuery = '';
  }
  showCreateGroupForm = false;
  newGroupName = '';
  newGroupDescription = '';
  newGroupCategory = 'MIXED';
  newGroupIsDefault = false;
  newGroupDefaultRole = '';

  activeRetrospective: any = null;
  retroLoading = false;
  retroGroupId?: string;

  error = '';
  loading = true;

  private pendingCalls = 0;
  private chart: Chart | null = null;
  private refreshInterval: any;

  ngOnInit(): void {
    Chart.register(...registerables);
    this.userService.fetchUsers();
    this.reload();
    
    this.refreshInterval = setInterval(() => {
      this.reloadDmMetadata();
    }, 30000);
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.loadChart(), 0);
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
  
  getUserName(userId: number): string {
    const user = this.userService.users().find(u => u.id === userId);
    if (user) {
      return `${user.prenom || ''} ${user.nom || ''}`.trim() || `User ${userId}`;
    }
    return `User ${userId}`;
  }
  
  reloadDmMetadata(): void {
    this.adminApi.getDirectMessageMetadata().subscribe({
      next: (r) => { this.dmMeta = r; },
      error: (e) => console.error('Failed to refresh DM metadata:', e)
    });
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
      next: (r) => { this.dmMeta = r; },
      error: (e) => this.fail(e)
    });

    this.adminApi.getEngagementMix().subscribe({ next: (r) => (this.engagementMix = r) });
    this.adminApi.getSentimentDistribution().subscribe({ next: (r) => (this.sentimentDist = r) });
    this.adminApi.getAiImpact().subscribe({ next: (r) => (this.aiImpact = r) });
    this.adminApi.getPulse().subscribe({ next: (r) => (this.clinicalPulse = r) });
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

  dismiss(pubId: string): void {
    this.adminApi.dismissFlag(pubId).subscribe({ next: () => this.reload(), error: (e) => this.fail(e) });
  }

  deletePost(pubId: string): void {
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

  switchView(v: 'health' | 'groups' | 'moderation' | 'announcements' | 'ai' | 'content'): void {
    this.currentView = v;
    this.error = '';
    if (v === 'groups') this.loadGroups();
    if (v === 'moderation') this.reload();
    if (v === 'ai') {
      this.loadGroups();
      this.activeRetrospective = null;
    }
    if (v === 'health') setTimeout(() => this.loadChart(), 0);
    if (v === 'announcements') this.loadScheduledAnnouncements();
    if (v === 'content') this.loadContent();
  }

  loadContent(): void {
    this.contentLoading = true;
    this.contentPage = 1;
    this.adminApi.getRecentPosts().subscribe({
      next: (r) => { this.contentPosts = r; this.contentLoading = false; },
      error: (e) => { this.fail(e); this.contentLoading = false; }
    });
    this.adminApi.getRecentGroupMessages().subscribe({
      next: (r) => { this.contentMessages = r; },
      error: () => {}
    });
    this.reloadDmMetadata();
  }

  adminDeletePost(id: string): void {
    if (!confirm('Permanently delete this post? This cannot be undone.')) return;
    this.adminApi.adminDeletePost(id).subscribe({
      next: () => { this.contentPosts = this.contentPosts.filter(p => p.id !== id); },
      error: (e) => this.fail(e)
    });
  }

  adminDeleteMessage(id: string): void {
    if (!confirm('Permanently delete this message? This cannot be undone.')) return;
    this.adminApi.adminDeleteMessage(id).subscribe({
      next: () => { this.contentMessages = this.contentMessages.filter(m => m.id !== id); },
      error: (e) => this.fail(e)
    });
  }

  loadScheduledAnnouncements(): void {
    this.adminApi.getScheduledAnnouncements().subscribe({
      next: (res) => this.scheduledAnnouncements = res,
      error: (e) => this.fail(e)
    });
  }

  cancelAnnouncement(id: string): void {
    if (!confirm('Cancel this scheduled announcement?')) return;
    this.adminApi.deletePost(id).subscribe({
      next: () => this.loadScheduledAnnouncements(),
      error: (e) => this.fail(e)
    });
  }

  viewLabel(v: string): string {
    switch (v) {
      case 'health': return 'Health Dashboard';
      case 'groups': return 'Community Groups';
      case 'moderation': return 'Moderation Queue';
      case 'announcements': return 'Announcement Form';
      case 'ai': return 'Clinical Intelligence';
      case 'content': return 'Content Management';
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

  getVelocityColor(v: string | undefined): string {
    if (!v) return 'text-muted';
    const low = v.toLowerCase();
    if (low.includes('improving')) return 'text-success';
    if (low.includes('degrading')) return 'text-danger';
    return 'text-primary';
  }

  loadGroups(): void {
    this.loading = true;
    this.adminApi.getAllGroups().subscribe({
      next: (g) => { this.groups = g; this.loading = false; },
      error: (e) => this.fail(e)
    });
    this.adminApi.getDefaultGroups().subscribe({
      next: (g) => { this.defaultGroups = g; },
      error: () => {}
    });
  }

  deleteGroup(id: string): void {
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

  submitCreateGroup(): void {
    if (!this.newGroupName.trim()) return;
    this.adminApi.createGroup({
      name: this.newGroupName.trim(),
      description: this.newGroupDescription.trim(),
      category: this.newGroupCategory,
      isDefault: this.newGroupIsDefault,
      defaultForRole: this.newGroupIsDefault ? this.newGroupDefaultRole : null
    }).subscribe({
      next: () => {
        this.showCreateGroupForm = false;
        this.newGroupName = '';
        this.newGroupDescription = '';
        this.newGroupCategory = 'MIXED';
        this.newGroupIsDefault = false;
        this.newGroupDefaultRole = '';
        this.loadGroups();
      },
      error: (e) => this.fail(e)
    });
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
    
    let scheduleIso: string | undefined = undefined;
    if (this.announcementScheduledAt) {
      scheduleIso = new Date(this.announcementScheduledAt).toISOString();
    }

    const gid = this.announcementTargetGroupId || undefined;

    this.adminApi.postAnnouncement(this.announcementText, gid, scheduleIso).subscribe({
      next: () => {
        alert(scheduleIso ? 'Announcement scheduled successfully.' : 'Global announcement broadcasted successfully.');
        this.announcementText = '';
        this.announcementTargetGroupId = null;
        this.announcementScheduledAt = '';
        this.loadScheduledAnnouncements();
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

  approvePost(id: string): void {
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

  fetchRetrospective(hours: number): void {
    if (!this.retroGroupId) {
      alert('Please select a clinical group to analyze first.');
      return;
    }
    this.retroLoading = true;
    this.activeRetrospective = null;
    this.adminApi.getRetrospective(this.retroGroupId, hours).subscribe({
      next: (res) => {
        this.activeRetrospective = { ...res, window: hours, parsedSections: this.parseHandover(res.summary) };
        this.retroLoading = false;
      },
      error: (e) => {
        this.fail(e);
        this.retroLoading = false;
      }
    });
  }

  /** Parses Gemini markdown into structured sections for display */
  parseHandover(raw: string): { icon: string; title: string; color: string; bgColor: string; items: string[] }[] {
    if (!raw) return [];
    
    const sectionDefs = [
      { markers: ['PATIENT COGNITION', 'COGNITION', 'MOOD'], icon: '🧠', title: 'Patient Cognition & Mood', color: 'text-primary', bgColor: 'bg-soft-primary border-primary' },
      { markers: ['CARE LOGISTICS', 'LOGISTICS', 'MEDICATION', 'ADL'], icon: '💊', title: 'Care Logistics', color: 'text-success', bgColor: 'bg-soft-success border-success' },
      { markers: ['RECOMMENDATION', 'ACTION', 'ALERT', 'CONCERN'], icon: '🚨', title: 'Recommendations', color: 'text-danger', bgColor: 'bg-soft-danger border-danger' },
    ];

    const sectionSplitRegex = /(?=\*{0,2}#{0,3}\s*\d+[\.\)]\s)/;
    const rawSections = raw.split(sectionSplitRegex).filter(s => s.trim().length > 0);

    const result: { icon: string; title: string; color: string; bgColor: string; items: string[] }[] = [];

    for (const rawSection of rawSections) {
      const upperSection = rawSection.toUpperCase();
      const def = sectionDefs.find(d => d.markers.some(m => upperSection.includes(m)));
      if (!def) continue;

      const lines = rawSection.split('\n')
        .map(l => l.replace(/^\*{1,2}|\*{1,2}$/g, '').replace(/^[-•*]\s*/, '').trim())
        .filter(l => l.length > 10 && !l.match(/^\d+[\.\)]/));

      if (lines.length > 0) {
        result.push({ ...def, items: lines });
      }
    }

    if (result.length === 0) {
      const lines = raw.split('\n')
        .map(l => l.replace(/\*\*/g, '').replace(/^[-•*#]\s*/, '').trim())
        .filter(l => l.length > 5);
      result.push({ icon: '📋', title: 'Clinical Handover', color: 'text-primary', bgColor: 'bg-soft-primary border-primary', items: lines });
    }

    return result;
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
                backgroundColor: '#0d6efd',
                borderRadius: 4
              },
              {
                label: 'Agitation / Negative Tone',
                data: t.negativeSentimentSeries,
                backgroundColor: '#ff9800',
                borderRadius: 4
              },
              {
                label: 'Critical Safety Alerts',
                data: t.criticalAlertSeries,
                backgroundColor: '#f44336',
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
        this.loadAdditionalCharts();
      },
      error: (e) => this.fail(e)
    });
  }

  private loadAdditionalCharts(): void {
    if (this.sentimentDist) {
      const canvas = this.sentimentCanvas?.nativeElement;
      if (canvas) {
        new Chart(canvas, {
          type: 'doughnut',
          data: {
            labels: ['Positive', 'Neutral', 'Negative'],
            datasets: [{
              data: [this.sentimentDist.positive, this.sentimentDist.neutral, this.sentimentDist.negative],
              backgroundColor: ['#10b981', '#94a3b8', '#ef4444'],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
          }
        });
      }
    }

    if (this.engagementMix) {
      const canvas = this.activityCanvas?.nativeElement;
      if (canvas) {
        new Chart(canvas, {
          type: 'pie',
          data: {
            labels: ['Posts', 'Comments', 'Direct Msg', 'Shared'],
            datasets: [{
              data: [this.engagementMix.publications, this.engagementMix.comments, this.engagementMix.messages, this.engagementMix.shares],
              backgroundColor: ['#6366f1', '#a855f7', '#ec4899', '#f59e0b'],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
          }
        });
      }
    }
  }
}
