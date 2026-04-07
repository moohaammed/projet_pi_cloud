import { Component, OnInit, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PatientService }  from '../../services/patient.service';
import { AnalyseService }  from '../../services/analyse.service';
import { UserService }     from '../../services/user.service';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-admin-gestion-patient',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-gestion-patient.component.html',
  styleUrls: ['./admin-gestion-patient.component.css']
})
export class AdminGestionPatientComponent implements OnInit, OnDestroy {
  private pid = inject(PLATFORM_ID);

  allPatients: any[] = [];
  allAnalyses: any[] = [];
  isLoading = false;
  successMsg = '';
  errorMsg   = '';

  // filter/pagination
  searchQuery = '';
  filterSex   = '';
  filterActif = '';
  currentPage = 1;
  readonly PAGE = 10;

  // modals
  showDetail  = false;
  showForm    = false;
  showDelConf = false;
  selectedP: any    = null;
  patientAnalyses: any[] = [];
  isLoadingAn = false;
  isEditMode  = false;
  isSubmitting = false;
  deletingP: any = null;
  activeTab: 'list'|'stats' = 'list';

  pForm: any = {};
  uForm: any = {};

  private charts: Chart[] = [];

  constructor(
    private patSvc:    PatientService,
    private anSvc:     AnalyseService,
    private userSvc:   UserService
  ) {}

  ngOnInit(): void { this.loadAll(); }

  ngOnDestroy(): void { this.destroyCharts(); }

  loadAll(): void {
    this.isLoading = true;
    this.patSvc.getAllPatients().subscribe({
      next: pts => {
        this.allPatients = pts || [];
        this.anSvc.getAllAnalyses().subscribe({
          next: an => { this.allAnalyses = an || []; this.isLoading = false; },
          error: ()  => { this.isLoading = false; }
        });
      },
      error: () => { this.isLoading = false; }
    });
  }

  get merged(): any[] {
    return this.allPatients.map(p => ({
      ...p,
      email: p.user?.email ?? '',
      telephone: p.user?.telephone ?? '',
      actif: p.user?.actif ?? true,
      createdAt: p.user?.createdAt ?? null,
      userId: p.user?.id ?? null,
    }));
  }

  get filtered(): any[] {
    let l = this.merged;
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      l = l.filter(p => `${p.nom} ${p.prenom} ${p.email}`.toLowerCase().includes(q));
    }
    if (this.filterSex)   l = l.filter(p => p.sexe === this.filterSex);
    if (this.filterActif !== '') l = l.filter(p => p.actif === (this.filterActif === 'true'));
    return l;
  }

  get paginated(): any[] {
    const s = (this.currentPage - 1) * this.PAGE;
    return this.filtered.slice(s, s + this.PAGE);
  }

  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.PAGE)); }
  get pageNums(): number[] {
    const arr: number[] = [];
    for (let i = Math.max(1, this.currentPage-2); i <= Math.min(this.totalPages, this.currentPage+2); i++) arr.push(i);
    return arr;
  }
  changePage(p: number): void { if (p>=1 && p<=this.totalPages) this.currentPage = p; }
  onFilter(): void { this.currentPage = 1; }

  // Stats
  get totalPat(): number { return this.allPatients.length; }
  get newThisMonth(): number {
    const n = new Date();
    return this.allPatients.filter(p => {
      const d = p.user?.createdAt ? new Date(p.user.createdAt) : null;
      return d && d.getMonth()===n.getMonth() && d.getFullYear()===n.getFullYear();
    }).length;
  }
  get activeCount():   number { return this.allPatients.filter(p => p.user?.actif !== false).length; }
  get inactiveCount(): number { return this.allPatients.filter(p => p.user?.actif === false).length; }
  anCount(pid: number): number { return this.allAnalyses.filter(a => a.patient?.id===pid).length; }

  // Actions
  openDetail(p: any): void {
    this.selectedP = p; this.showDetail = true; this.isLoadingAn = true; this.patientAnalyses = [];
    this.anSvc.getAnalysesByPatient(p.id).subscribe({
      next: d => { this.patientAnalyses = d||[]; this.isLoadingAn = false; },
      error:()  => { this.isLoadingAn = false; }
    });
  }
  closeDetail(): void { this.showDetail = false; this.selectedP = null; this.patientAnalyses = []; }

  openCreate(): void {
    this.isEditMode = false; this.pForm = {sexe:'Homme'}; this.uForm={role:'PATIENT',actif:true}; this.showForm = true;
  }
  openEdit(p: any): void {
    this.isEditMode = true; this.selectedP = p;
    this.pForm = { id:p.id, nom:p.nom, prenom:p.prenom, age:p.age, poids:p.poids, sexe:p.sexe, userId:p.userId };
    this.uForm = { id:p.userId, nom:p.nom, prenom:p.prenom, email:p.email, telephone:p.telephone, role:'PATIENT', actif:p.actif };
    this.showForm = true;
  }
  closeForm(): void { this.showForm = false; this.pForm = {}; this.uForm = {}; }

  save(): void {
    this.isSubmitting = true;
    if (this.isEditMode) {
      this.patSvc.updatePatient(this.pForm.id, {...this.pForm, user_id: this.pForm.userId}).subscribe({
        next: () => {
          if (this.uForm.id) {
            this.userSvc.update(this.uForm.id, this.uForm).subscribe({
              next: ()  => this.afterSave('Patient mis à jour avec succès.'),
              error: () => this.afterSave('Profil mis à jour.')
            });
          } else { this.afterSave('Patient mis à jour.'); }
        },
        error: () => { this.isSubmitting=false; this.showError('Erreur mise à jour.'); }
      });
    } else {
      this.userSvc.create({
        nom:this.pForm.nom, prenom:this.pForm.prenom,
        email:this.uForm.email, password:this.uForm.password||'AlzCare2026!',
        telephone:this.uForm.telephone, role:'PATIENT', actif:true
      }).subscribe({
        next: created => {
          this.patSvc.addPatient({
            nom:this.pForm.nom, prenom:this.pForm.prenom,
            age:this.pForm.age, poids:this.pForm.poids,
            sexe:this.pForm.sexe, user_id:created.id
          }).subscribe({
            next: ()  => this.afterSave('Patient créé avec succès.'),
            error: () => { this.isSubmitting=false; this.showError('Compte créé, erreur profil patient.'); }
          });
        },
        error: err => { this.isSubmitting=false; this.showError(err.error?.message||'Erreur création.'); }
      });
    }
  }
  private afterSave(msg: string): void {
    this.isSubmitting=false; this.showSuccess(msg); this.closeForm(); this.loadAll();
  }

  openDelete(p: any): void { this.deletingP = p; this.showDelConf = true; }
  doDelete(): void {
    if (!this.deletingP) return;
    this.patSvc.deletePatient(this.deletingP.id).subscribe({
      next: () => { this.showSuccess('Patient supprimé.'); this.showDelConf=false; this.deletingP=null; this.loadAll(); },
      error: () => this.showError('Erreur suppression.')
    });
  }

  toggleActif(p: any): void {
    if (!p.userId) { this.showError('Aucun compte associé.'); return; }
    this.userSvc.toggleActif(p.userId).subscribe({
      next: u => {
        const idx = this.allPatients.findIndex(x => x.id===p.id);
        if (idx>=0 && this.allPatients[idx].user) this.allPatients[idx].user.actif = u.actif;
        this.showSuccess(u.actif ? 'Compte activé.' : 'Compte suspendu.');
      },
      error: () => this.showError('Erreur toggle accès.')
    });
  }

  resetPassword(p: any): void {
    if (!p.email) { this.showError('Email introuvable.'); return; }
    if (!confirm(`Envoyer un nouveau mot de passe à ${p.email}?`)) return;
    this.userSvc.resetPasswordByEmail(p.email).subscribe({
      next: ()  => this.showSuccess('Nouveau mot de passe envoyé par email.'),
      error: () => this.showError('Erreur réinitialisation mot de passe.')
    });
  }

  // Tabs & Charts
  setTab(t: 'list'|'stats'): void {
    this.activeTab = t;
    if (t==='stats' && isPlatformBrowser(this.pid)) setTimeout(() => this.initCharts(), 250);
  }
  private destroyCharts(): void { this.charts.forEach(c => { try{c.destroy();}catch{} }); this.charts=[]; }

  initCharts(): void {
    this.destroyCharts();
    // Sex donut
    const sexMap: Record<string,number> = {};
    this.allPatients.forEach(p => { const k=p.sexe||'Inconnu'; sexMap[k]=(sexMap[k]||0)+1; });
    this.makeDonut('chartSex', Object.keys(sexMap), Object.values(sexMap), ['#8b5cf6','#f472b6','#a78bfa','#c4b5fd']);

    // Age groups bar
    const ag: Record<string,number> = {'0-20':0,'21-40':0,'41-60':0,'61-80':0,'80+':0};
    this.allPatients.forEach(p => {
      const a = p.age;
      if (a==null) return;
      if (a<=20) ag['0-20']++; else if (a<=40) ag['21-40']++; else if (a<=60) ag['41-60']++; else if (a<=80) ag['61-80']++; else ag['80+']++;
    });
    this.makeBar('chartAge', Object.keys(ag), Object.values(ag));

    // Alzheimer classification
    const alzMap: Record<string,number> = {};
    this.allAnalyses.forEach(a => { if (a.interpretation) { const k=a.interpretation; alzMap[k]=(alzMap[k]||0)+1; } });
    if (!Object.keys(alzMap).length) alzMap['Aucune donnée']=1;
    this.makeDonut('chartAlz', Object.keys(alzMap), Object.values(alzMap), ['#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899']);

    // Analyses per patient (top 8)
    const anPat: {name:string; count:number}[] = this.allPatients
      .map(p => ({ name:`${p.prenom} ${p.nom}`, count: this.allAnalyses.filter(a=>a.patient?.id===p.id).length }))
      .sort((a,b)=>b.count-a.count).slice(0,8);
    this.makeBar('chartAnPat', anPat.map(x=>x.name), anPat.map(x=>x.count), '#a78bfa');
  }

  private makeDonut(id: string, labels: string[], data: number[], colors: string[]): void {
    const el = document.getElementById(id) as HTMLCanvasElement;
    if (!el) return;
    const c = new Chart(el, {
      type:'doughnut',
      data:{ labels, datasets:[{ data, backgroundColor:colors, borderWidth:2 }] },
      options:{ responsive:true, plugins:{ legend:{ position:'bottom' } } }
    });
    this.charts.push(c);
  }
  private makeBar(id: string, labels: string[], data: number[], color='#8b5cf6'): void {
    const el = document.getElementById(id) as HTMLCanvasElement;
    if (!el) return;
    const c = new Chart(el, {
      type:'bar',
      data:{ labels, datasets:[{ data, backgroundColor:color, borderRadius:6, borderSkipped:false }] },
      options:{ responsive:true, plugins:{ legend:{display:false} }, scales:{ y:{beginAtZero:true, grid:{color:'rgba(0,0,0,0.04)'} } } }
    });
    this.charts.push(c);
  }

  showSuccess(m: string): void { this.successMsg=m; this.errorMsg=''; setTimeout(()=>this.successMsg='',4000); }
  showError(m: string):   void { this.errorMsg=m;   this.successMsg=''; setTimeout(()=>this.errorMsg='',5000); }
  fmt(d: string): string { return d ? new Date(d).toLocaleDateString('fr-FR') : '-'; }
}
