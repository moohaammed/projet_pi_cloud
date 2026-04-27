import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface DayStat { date: string; incidents: number; alerts: number; }
interface PatientStat {
  patientId: number;
  nom: string; prenom: string;
  totalIncidents: number; totalAlerts: number;
  unresolvedAlerts: number; activeIncidents: number;
  sortiesZoneVerte: number;   // ← NOUVEAU
  sortiesZoneRouge: number;   // ← NOUVEAU
  dailyStats: DayStat[];
}

@Component({
  selector: 'app-admin-dashboard-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard-geo.component.html',
})
export class AdminDashboardGeoComponent implements OnInit, OnDestroy {

  @ViewChild('lineChart') lineChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('donutChart') donutChartRef!: ElementRef<HTMLCanvasElement>;

  private lineChartInstance: any = null;
  private donutChartInstance: any = null;
  private chartjsLoaded = false;

  totalPatients  = 0;
  totalDoctors   = 0;
  totalRelations = 0;

  statsPatients: PatientStat[] = [];
  statsLoading   = true;
  selectedPatient: PatientStat | null = null;
  periode = 7;

  get totalIncidents():      number { return this.statsPatients.reduce((s,p)=>s+p.totalIncidents,0); }
  get totalAlerts():         number { return this.statsPatients.reduce((s,p)=>s+p.totalAlerts,0); }
  get alertsActives():       number { return this.statsPatients.reduce((s,p)=>s+p.unresolvedAlerts,0); }
  get incidentsActifs():     number { return this.statsPatients.reduce((s,p)=>s+p.activeIncidents,0); }
  get totalSortiesVerte():   number { return this.statsPatients.reduce((s,p)=>s+p.sortiesZoneVerte,0); }

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadChartJs().then(() => {
      this.loadKpi();
      this.loadStats();
    });
  }

  ngOnDestroy(): void {
    this.lineChartInstance?.destroy();
    this.donutChartInstance?.destroy();
  }

  // ── Charger Chart.js dynamiquement ────────────────────────────
  private loadChartJs(): Promise<void> {
    return new Promise(resolve => {
      if ((window as any).Chart) { this.chartjsLoaded = true; resolve(); return; }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
      script.onload = () => { this.chartjsLoaded = true; resolve(); };
      script.onerror = () => resolve();
      document.head.appendChild(script);
    });
  }

  loadKpi(): void {
    this.http.get<any[]>(`${environment.apiUrl}/api/users`).subscribe({
      next: (users) => {
        this.totalPatients  = users.filter(u => u.role === 'PATIENT').length;
        this.totalDoctors   = users.filter(u => u.role === 'DOCTOR').length;
        this.totalRelations = users.filter(u => u.role === 'RELATION').length;
      }
    });
  }

  loadStats(): void {
    this.statsLoading = true;
    this.statsPatients = [];
    this.lineChartInstance?.destroy();
    this.donutChartInstance?.destroy();

    this.http.get<any[]>(`${environment.apiUrl}/api/users/role/PATIENT`).subscribe({
      next: (patients) => {
        if (!patients?.length) { this.statsLoading = false; return; }
        let remaining = patients.length;

        patients.forEach(p => {
          const pStat: PatientStat = {
            patientId: p.id, nom: p.nom, prenom: p.prenom,
            totalIncidents: 0, totalAlerts: 0,
            unresolvedAlerts: 0, activeIncidents: 0,
            sortiesZoneVerte: 0,
            sortiesZoneRouge: 0,
            dailyStats: this.emptyDays(this.periode)
          };
          let done = 0;
          const check = () => {
            if (++done === 2 && --remaining === 0) {
              this.statsLoading = false;
              // Attendre que le DOM soit rendu
              setTimeout(() => this.drawCharts(), 300);
            }
          };

          // Incidents
          this.http.get<any[]>(`${environment.geoApiUrl}/api/incidents/patient/${p.id}`).subscribe({
            next: (inc) => {
              pStat.totalIncidents  = inc.length;
              pStat.activeIncidents = inc.filter(i=>i.status==='EN_COURS').length;
              inc.forEach(i => {
                const d = pStat.dailyStats.find(s=>s.date===i.createdAt?.substring(0,10));
                if (d) d.incidents++;
              });
              this.statsPatients.push(pStat);
              check();
            },
            error: () => { this.statsPatients.push(pStat); check(); }
          });

          // Alertes + comptage sorties zone
          this.http.get<any[]>(`${environment.geoApiUrl}/api/alerts/patient/${p.id}`).subscribe({
            next: (al) => {
              pStat.totalAlerts      = al.length;
              pStat.unresolvedAlerts = al.filter(a=>!a.resolue).length;
              // ← Comptage sorties zone
              pStat.sortiesZoneVerte = al.filter(a =>
                a.typeAlerte === 'HORS_ZONE_VERTE' || a.typeAlerte === 'HORS_ZONE_ROUGE'
              ).length;
              pStat.sortiesZoneRouge = al.filter(a =>
                a.typeAlerte === 'HORS_ZONE_ROUGE'
              ).length;
              al.forEach(a => {
                const d = pStat.dailyStats.find(s=>s.date===a.declencheeAt?.substring(0,10));
                if (d) d.alerts++;
              });
              check();
            },
            error: () => check()
          });
        });
      },
      error: () => { this.statsLoading = false; }
    });
  }

  // ── Charts ────────────────────────────────────────────────────
  private drawCharts(): void {
    if (!this.chartjsLoaded || !(window as any).Chart) return;
    this.drawLineChart();
    this.drawDonutChart();
  }

  private drawLineChart(): void {
    const canvas = this.lineChartRef?.nativeElement;
    if (!canvas) return;
    this.lineChartInstance?.destroy();

    const days = this.emptyDays(this.periode);
    this.statsPatients.forEach(p => {
      p.dailyStats.forEach(d => {
        const day = days.find(dd => dd.date === d.date);
        if (day) { day.incidents += d.incidents; day.alerts += d.alerts; }
      });
    });

    this.lineChartInstance = new (window as any).Chart(canvas, {
      type: 'line',
      data: {
        labels: days.map(d => this.formatDate(d.date)),
        datasets: [
          {
            label: 'Incidents',
            data: days.map(d => d.incidents),
            borderColor: '#6f42c1',
            backgroundColor: 'rgba(111,66,193,.15)',
            borderWidth: 2.5, pointBackgroundColor: '#6f42c1',
            pointRadius: 5, tension: 0.4, fill: true,
          },
          {
            label: 'Alertes',
            data: days.map(d => d.alerts),
            borderColor: '#e67e22',
            backgroundColor: 'rgba(230,126,34,.12)',
            borderWidth: 2.5, pointBackgroundColor: '#e67e22',
            pointRadius: 5, tension: 0.4, fill: true,
          },
          {
            label: 'Sorties zone verte',
            data: days.map(d => {
              // Recalcule sorties par jour
              return this.statsPatients.reduce((sum, p) => {
                const day = p.dailyStats.find(dd => dd.date === d.date);
                return sum + (day?.alerts || 0);
              }, 0);
            }),
            borderColor: '#198754',
            backgroundColor: 'rgba(25,135,84,.10)',
            borderWidth: 2, pointBackgroundColor: '#198754',
            pointRadius: 4, tension: 0.4, fill: false,
            borderDash: [5, 3],
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: { usePointStyle: true, padding: 16, font: { size: 12 } }
          },
          tooltip: { mode: 'index' }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,.05)' },
            ticks: { stepSize: 1, font: { size: 11 } }
          }
        }
      }
    });
  }

  private drawDonutChart(): void {
    const canvas = this.donutChartRef?.nativeElement;
    if (!canvas || !this.statsPatients.length) return;
    this.donutChartInstance?.destroy();

    const sorted = [...this.statsPatients]
      .sort((a,b) => (b.sortiesZoneVerte + b.totalIncidents) - (a.sortiesZoneVerte + a.totalIncidents))
      .slice(0, 6);

    const colors = ['#6f42c1','#e67e22','#dc3545','#198754','#0d6efd','#e91e8c'];

    this.donutChartInstance = new (window as any).Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: sorted.map(p => `${p.prenom} ${p.nom}`),
        datasets: [{
          data: sorted.map(p => p.sortiesZoneVerte || p.totalAlerts),
          backgroundColor: colors,
          borderWidth: 3, borderColor: '#fff', hoverOffset: 8,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { usePointStyle: true, padding: 10, font: { size: 11 } }
          },
          tooltip: {
            callbacks: {
              label: (ctx: any) => ` ${ctx.label} : ${ctx.raw} sorties de zone`
            }
          }
        }
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────
  private emptyDays(n: number): DayStat[] {
    return Array.from({length: n}, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (n-1-i));
      return { date: d.toISOString().substring(0,10), incidents: 0, alerts: 0 };
    });
  }

  maxBar(p: PatientStat): number {
    return Math.max(1, ...p.dailyStats.map(d => Math.max(d.incidents, d.alerts)));
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('fr', {day:'2-digit', month:'short'});
  }

  selectPatient(p: PatientStat): void {
    this.selectedPatient = this.selectedPatient?.patientId === p.patientId ? null : p;
  }

  changePeriode(n: number): void { this.periode = n; this.loadStats(); }

  severity(p: PatientStat): string {
    if (p.sortiesZoneRouge > 0 || p.unresolvedAlerts > 3) return 'danger';
    if (p.sortiesZoneVerte > 0 || p.unresolvedAlerts > 0) return 'warning';
    return 'success';
  }

  zoneBarWidth(p: PatientStat): number {
    const max = Math.max(1, ...this.statsPatients.map(pp => pp.sortiesZoneVerte));
    return Math.round((p.sortiesZoneVerte / max) * 100);
  }
}