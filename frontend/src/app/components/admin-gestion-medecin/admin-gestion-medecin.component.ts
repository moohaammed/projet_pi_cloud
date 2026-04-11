import { Component, OnInit, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UserService }    from '../../services/user.service';
import { PatientService } from '../../services/patient.service';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-admin-gestion-medecin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-gestion-medecin.component.html',
  styleUrls: ['./admin-gestion-medecin.component.css']
})
export class AdminGestionMedecinComponent implements OnInit, OnDestroy {
  private pid = inject(PLATFORM_ID);

  allDoctors:  any[] = [];
  allPatients: any[] = [];
  isLoading = false;
  successMsg = '';
  errorMsg   = '';

  searchQuery = '';
  filterActif = '';
  currentPage = 1;
  readonly PAGE = 10;

  showDetail  = false;
  showForm    = false;
  showDelConf = false;
  selectedDoc: any   = null;
  isEditMode  = false;
  isSubmitting = false;
  deletingDoc: any   = null;
  activeTab: 'list'|'stats' = 'list';

  dForm: any = {};
  private charts: Chart[] = [];

  constructor(private userSvc: UserService, private patSvc: PatientService) {}

  ngOnInit(): void { this.loadAll(); }
  ngOnDestroy(): void { this.destroyCharts(); }

  loadAll(): void {
    this.isLoading = true;
    this.userSvc.getByRole('DOCTOR').subscribe({
      next: docs => {
        this.allDoctors = docs || [];
        this.patSvc.getAllPatients().subscribe({
          next: pts => { this.allPatients = pts||[]; this.isLoading = false; },
          error: () => { this.isLoading = false; }
        });
      },
      error: () => { this.isLoading = false; }
    });
  }

  get filtered(): any[] {
    let l = this.allDoctors;
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      l = l.filter(d => `${d.nom} ${d.prenom} ${d.email}`.toLowerCase().includes(q));
    }
    if (this.filterActif !== '') l = l.filter(d => d.actif === (this.filterActif==='true'));
    return l;
  }
  get paginated(): any[] { const s=(this.currentPage-1)*this.PAGE; return this.filtered.slice(s,s+this.PAGE); }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length/this.PAGE)); }
  get pageNums(): number[] {
    const arr: number[] = [];
    for (let i=Math.max(1,this.currentPage-2); i<=Math.min(this.totalPages,this.currentPage+2); i++) arr.push(i);
    return arr;
  }
  changePage(p:number): void { if(p>=1&&p<=this.totalPages) this.currentPage=p; }
  onFilter(): void { this.currentPage=1; }

  // Stats
  get totalDocs():     number { return this.allDoctors.length; }
  get newThisMonth():  number {
    const n=new Date();
    return this.allDoctors.filter(d => {
      const dt=d.createdAt?new Date(d.createdAt):null;
      return dt&&dt.getMonth()===n.getMonth()&&dt.getFullYear()===n.getFullYear();
    }).length;
  }
  get activeCount():   number { return this.allDoctors.filter(d=>d.actif).length; }
  get inactiveCount(): number { return this.allDoctors.filter(d=>!d.actif).length; }

  // Actions
  openDetail(d: any): void { this.selectedDoc=d; this.showDetail=true; }
  closeDetail(): void { this.showDetail=false; this.selectedDoc=null; }

  openCreate(): void {
    this.isEditMode=false; this.dForm={role:'DOCTOR',actif:true}; this.showForm=true;
  }
  openEdit(d: any): void {
    this.isEditMode=true; this.selectedDoc=d;
    this.dForm={ id:d.id, nom:d.nom, prenom:d.prenom, email:d.email, telephone:d.telephone, specialite:d.specialite||'', role:'DOCTOR', actif:d.actif };
    this.showForm=true;
  }
  closeForm(): void { this.showForm=false; this.dForm={}; }

  save(): void {
    this.isSubmitting=true;
    const payload = { ...this.dForm, role:'DOCTOR' };
    if (this.isEditMode) {
      this.userSvc.update(this.dForm.id, payload).subscribe({
        next: () => this.afterSave('Médecin mis à jour.'),
        error: () => { this.isSubmitting=false; this.showError('Erreur mise à jour.'); }
      });
    } else {
      if (!payload.password) payload.password = 'AlzCare2026!';
      this.userSvc.create(payload).subscribe({
        next: () => this.afterSave('Médecin créé avec succès.'),
        error: err => { this.isSubmitting=false; this.showError(err.error?.message||'Erreur création.'); }
      });
    }
  }
  private afterSave(msg:string): void { this.isSubmitting=false; this.showSuccess(msg); this.closeForm(); this.loadAll(); }

  openDelete(d: any): void { this.deletingDoc=d; this.showDelConf=true; }
  doDelete(): void {
    if (!this.deletingDoc) return;
    this.userSvc.delete(this.deletingDoc.id).subscribe({
      next: () => { this.showSuccess('Médecin supprimé.'); this.showDelConf=false; this.deletingDoc=null; this.loadAll(); },
      error: () => this.showError('Erreur suppression.')
    });
  }

  toggleActif(d: any): void {
    this.userSvc.toggleActif(d.id).subscribe({
      next: u => {
        const idx=this.allDoctors.findIndex(x=>x.id===d.id);
        if (idx>=0) this.allDoctors[idx].actif=u.actif;
        this.showSuccess(u.actif?'Compte activé.':'Compte suspendu.');
      },
      error: () => this.showError('Erreur toggle accès.')
    });
  }

  resetPassword(d: any): void {
    if (!d.email) { this.showError('Email introuvable.'); return; }
    if (!confirm(`Envoyer un nouveau mot de passe à ${d.email}?`)) return;
    this.userSvc.resetPasswordByEmail(d.email).subscribe({
      next: ()  => this.showSuccess('Nouveau mot de passe envoyé par email.'),
      error: () => this.showError('Erreur réinitialisation.')
    });
  }

  // Charts
  setTab(t:'list'|'stats'): void {
    this.activeTab=t;
    if (t==='stats' && isPlatformBrowser(this.pid)) setTimeout(()=>this.initCharts(),250);
  }
  private destroyCharts(): void { this.charts.forEach(c=>{try{c.destroy();}catch{}}); this.charts=[]; }

  initCharts(): void {
    this.destroyCharts();
    // Active vs inactive donut
    this.makeDonut('chartDocActif',
      ['Actifs','Suspendus'],
      [this.activeCount, this.inactiveCount],
      ['#10b981','#ef4444']
    );
    // Doctors registered by month (last 6)
    const monthly = this.getMonthlyReg();
    this.makeBar('chartDocMonth', monthly.labels, monthly.values);
    // Age distribution of doctors
    const ag: Record<string,number> = {'25-35':0,'36-45':0,'46-55':0,'55+':0};
    this.allDoctors.forEach(d => { /* no age field on user */ });
    // Patients per doctor (ALL doctors see ALL patients equally)
    const topDocs = this.allDoctors.slice(0,8);
    this.makeBar('chartPatDoc',
      topDocs.map(d=>`Dr. ${d.prenom} ${d.nom}`),
      topDocs.map(()=>this.allPatients.length),
      '#8b5cf6'
    );
  }

  private getMonthlyReg(): {labels:string[];values:number[]} {
    const months=['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    const now = new Date();
    const labels: string[] = [];
    const values: number[] = [];
    for (let i=5; i>=0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      labels.push(months[d.getMonth()]);
      values.push(this.allDoctors.filter(doc => {
        if (!doc.createdAt) return false;
        const dd=new Date(doc.createdAt);
        return dd.getMonth()===d.getMonth()&&dd.getFullYear()===d.getFullYear();
      }).length);
    }
    return {labels,values};
  }

  private makeDonut(id:string, labels:string[], data:number[], colors:string[]): void {
    const el=document.getElementById(id) as HTMLCanvasElement;
    if (!el) return;
    this.charts.push(new Chart(el,{
      type:'doughnut',
      data:{labels,datasets:[{data,backgroundColor:colors,borderWidth:2}]},
      options:{responsive:true,plugins:{legend:{position:'bottom'}}}
    }));
  }
  private makeBar(id:string, labels:string[], data:number[], color='#8b5cf6'): void {
    const el=document.getElementById(id) as HTMLCanvasElement;
    if (!el) return;
    this.charts.push(new Chart(el,{
      type:'bar',
      data:{labels,datasets:[{data,backgroundColor:color,borderRadius:6,borderSkipped:false as any}]},
      options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:'rgba(0,0,0,0.04)'}}}}
    }));
  }

  showSuccess(m:string): void { this.successMsg=m; this.errorMsg=''; setTimeout(()=>this.successMsg='',4000); }
  showError(m:string):   void { this.errorMsg=m;   this.successMsg=''; setTimeout(()=>this.errorMsg='',5000); }
  fmt(d:string): string { return d?new Date(d).toLocaleDateString('fr-FR'):'-'; }
}
