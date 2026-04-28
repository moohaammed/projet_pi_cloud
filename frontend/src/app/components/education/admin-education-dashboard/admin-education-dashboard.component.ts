import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-education-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- Page Header WITH INNER DROPDOWN -->
    <div class="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom border-black border-opacity-10 position-relative" style="z-index: 10;">
      <div class="d-flex align-items-center gap-4">
        <div class="section-header text-start mb-0">
          <h2 class="fw-bold mb-1 section-header__title text-capitalize fs-28">
            Education <span class="underline position-relative text-primary">Dashboard</span>
          </h2>
          <div class="sub-title fs-14 text-muted">Manage therapeutic content and the event calendar.</div>
        </div>
      </div>
      <!-- Actions -->
      <div class="d-flex align-items-center gap-2 mt-3 mt-md-0">
        <button class="btn btn-primary fw-bold rounded-pill shadow-sm d-flex justify-content-center align-items-center py-2" style="width: 140px;">
          <i class="fa-solid fa-arrows-rotate me-2"></i> Refresh
        </button>
      </div>
    </div>

    <!-- KPIs -->
    <section class="mb-5 mt-4">
      <h2 class="h6 mb-4 fw-bold text-muted text-uppercase" style="letter-spacing: 1px;">Overview</h2>
      <div class="row g-4">
        <!-- Activités KPI -->
        <div class="col-md-4">
          <div class="card shadow border-0 h-100 rounded-4 transition-hover bg-white border-start border-4 border-primary">
            <div class="card-body p-4">
              <div class="text-muted small fw-bold text-uppercase mb-2" style="opacity: 0.7;">Activities Created</div>
              <div class="fs-1 fw-bold text-dark mb-1 d-flex align-items-end">
                12
                <span class="fs-14 text-primary ms-2 mb-2 px-2 py-1 bg-soft-primary rounded-pill fw-bold">Active</span>
              </div>
              <p class="small mb-0 text-muted">Quiz, Exercises, Games in DB.</p>
            </div>
          </div>
        </div>
        <!-- Événements KPI -->
        <div class="col-md-4">
          <div class="card shadow border-0 h-100 rounded-4 transition-hover bg-white border-start border-4 border-success">
            <div class="card-body p-4">
              <div class="text-muted small fw-bold text-uppercase mb-2" style="opacity: 0.7;">Upcoming Events</div>
              <div class="fs-1 fw-bold text-dark mb-1 d-flex align-items-end">
                4
                <span class="fs-14 text-success ms-2 mb-2 px-2 py-1 bg-soft-success rounded-pill fw-bold">Planned</span>
              </div>
              <p class="small mb-0 text-muted">Scheduled sessions and conferences.</p>
            </div>
          </div>
        </div>
        <!-- Participation KPI -->
        <div class="col-md-4">
          <div class="card shadow border-0 h-100 rounded-4 transition-hover bg-white border-start border-4 border-warning">
            <div class="card-body p-4">
              <div class="text-muted small fw-bold text-uppercase mb-2" style="opacity: 0.7;">Completion Rate</div>
              <div class="fs-1 fw-bold text-dark mb-1 d-flex align-items-end">
                78%
              </div>
              <p class="small mb-0 text-muted">Average patient completion.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Gestion Modules -->
    <section class="mb-5">
      <h2 class="h6 mb-4 fw-bold text-muted text-uppercase" style="letter-spacing: 1px;">Module Administration</h2>
      <div class="row g-4">
        <!-- Gestion des Activités -->
        <div class="col-lg-6">
          <div class="card shadow border-0 p-5 rounded-4 bg-white h-100">
            <div class="d-flex align-items-center mb-4">
              <div class="bg-soft-primary text-primary rounded-circle p-3 me-3 d-flex align-items-center justify-content-center shadow-sm" style="width: 64px; height: 64px;">
                <i class="fa-solid fa-gamepad fs-4"></i>
              </div>
              <div>
                <h4 class="mb-0 fw-bold text-dark">Therapeutic Space</h4>
                <p class="text-muted small mb-0">Activity Builder & Content</p>
              </div>
            </div>
            <p class="text-muted mb-4 fs-15">
              Manage the therapeutic foundation of the application. You can configure memory quizzes, add interactive games and documentation.
            </p>
            <div class="text-end mt-auto">
              <button routerLink="/activities" class="btn btn-primary btn-lg fw-bold rounded-pill px-5 shadow transition-hover">
                <i class="fa-solid fa-arrow-right-to-bracket me-2"></i> Manage Activities
              </button>
            </div>
          </div>
        </div>

        <!-- Gestion des Événements -->
        <div class="col-lg-6">
          <div class="card border-0 bg-soft-primary rounded-4 p-5 shadow h-100">
            <div class="d-flex align-items-center mb-4">
              <div class="bg-white text-primary rounded-circle p-3 me-3 d-flex align-items-center justify-content-center shadow-sm" style="width: 64px; height: 64px;">
                <i class="fa-solid fa-calendar-star fs-4"></i>
              </div>
              <div>
                <h4 class="mb-0 fw-bold text-primary">Agenda & Events</h4>
                <p class="text-dark opacity-75 small mb-0">Group session planning</p>
              </div>
            </div>
            <ul class="list-unstyled small text-dark opacity-75 d-flex flex-column gap-3 mb-4">
              <li class="d-flex align-items-start">
                <i class="fa-solid fa-check text-primary me-2 mt-1"></i>
                Organize and publish new events.
              </li>
              <li class="d-flex align-items-start">
                <i class="fa-solid fa-check text-primary me-2 mt-1"></i>
                Automatic reminders (email/sms) for participants.
              </li>
            </ul>
            <div class="text-end mt-auto">
              <button routerLink="/events" class="btn bg-white text-primary btn-lg fw-bold rounded-pill px-5 shadow transition-hover border-0">
                <i class="fa-solid fa-arrow-right-to-bracket me-2"></i> Manage Events
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .transition-hover {
      transition: all 0.3s ease;
    }
    .transition-hover:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 30px rgba(128, 0, 128, 0.15) !important;
    }
    .bg-soft-primary { background-color: rgba(128,0,128,0.08) !important; }
    .bg-soft-success { background-color: rgba(25,135,84,0.1) !important; }
    .bg-soft-warning { background-color: rgba(255,193,7,0.18) !important; }
    .text-primary { color: #800080 !important; }
    .btn-primary { background-color: #800080; border-color: #800080; color: white; }
    .btn-primary:hover { background-color: #660066; border-color: #660066; }
    .border-primary { border-color: #800080 !important; }
    .border-success { border-color: #198754 !important; }
    .border-warning { border-color: #ffc107 !important; }
    .underline::after {
      content: '';
      position: absolute;
      left: 0;
      bottom: -4px;
      width: 100%;
      height: 3px;
      background-color: #800080;
      border-radius: 2px;
    }
  `]
})
export class AdminEducationDashboardComponent {}
