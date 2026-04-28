import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../../services/education/event.service';
import { EventSeatGridComponent } from './event-seat-grid.component';
import { CalendarEvent } from '../../../models/education/event.model';
import { PublicationService } from '../../../services/collaboration/publication.service';
import { MessageService } from '../../../services/collaboration/message.service';
import { ChatGroupService } from '../../../services/collaboration/chat-group.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-event-front',
  templateUrl: './event_front.html',
  standalone: true,
  imports: [CommonModule, FormsModule, EventSeatGridComponent],
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Fraunces:wght@700;800&display=swap');

    :host {
      --primary:      #800080;
      --primary-light:#f5e6f5;
      --primary-mid:  #e8c8e8;
      --primary-hover:#660066;
      --primary-dark: #4d004d;
      --white:        #ffffff;
      --bg:           #fdf5fd;
      --card-bg:      #ffffff;
      --border:       #e0c8e0;
      --text-dark:    #2e152e;
      --text-mid:     #6b3e6b;
      --text-light:   #b07ab0;
      --shadow:       0 2px 16px rgba(128, 0, 128, 0.08);
      --shadow-card:  0 4px 24px rgba(128, 0, 128, 0.10);
      --radius:       16px;
      --radius-sm:    10px;
      display: block;
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: #ffffff !important;
    }

    .events-page {
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
      margin-bottom: 20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
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
      z-index: 0;
    }

    .page-header::after {
      content: '';
      position: absolute;
      bottom: -40px; right: 10%;
      width: 120px; height: 120px;
      background: var(--primary-mid);
      filter: blur(40px);
      border-radius: 50%;
      opacity: 0.3;
      z-index: 0;
    }

    .title-container {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .header-badge {
      display: inline-block;
      padding: 6px 14px;
      background: var(--white);
      color: var(--primary-dark);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      border-radius: 50px;
      border: 1px solid var(--primary-light);
      box-shadow: 0 4px 12px rgba(128,0,128,0.05);
      margin-bottom: 4px;
    }

    .page-title {
      font-family: 'Fraunces', serif;
      font-size: 3.2rem;
      font-weight: 800;
      color: var(--text-dark);
      background: linear-gradient(to right, var(--text-dark), var(--primary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0;
      line-height: 1.1;
      letter-spacing: -.02em;
    }

    .page-subtitle {
      font-size: 1.1rem;
      color: var(--text-mid);
      margin: 0;
      max-width: none !important;
      white-space: nowrap !important;
      line-height: 1.5;
    }

    .controls-row {
      display: flex;
      align-items: center;
      margin-bottom: 30px;
      position: relative;
      z-index: 2;
      min-height: 50px;
    }

    .search-box {
      background: var(--white);
      border: 1.5px solid var(--border);
      border-radius: 50px;
      padding: 12px 20px 12px 42px;
      box-shadow: 0 8px 30px rgba(128, 0, 128, 0.06);
      transition: all 0.3s ease;
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      width: 100%;
      max-width: 450px;
    }
    .search-box:focus-within { 
      border-color: var(--primary);
      box-shadow: 0 8px 30px rgba(128, 0, 128, 0.12);
      transform: translateX(-50%) translateY(-2px);
    }

    .search-icon {
      position: absolute; left: 16px;
      width: 18px; height: 18px;
      color: var(--text-light);
      pointer-events: none;
    }

    .search-input {
      background: transparent;
      border: none;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: .95rem;
      color: var(--text-dark);
      outline: none;
      width: 100%;
    }
    .search-input::placeholder { color: var(--text-light); }

    .stats-bar {
      display: inline-flex;
      align-items: center;
      gap: 0;
      background: var(--white);
      border: 1.5px solid var(--border);
      border-radius: 50px;
      padding: 6px 6px;
      margin-bottom: 22px;
      box-shadow: var(--shadow);
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 20px;
    }

    .stat-icon {
      width: 32px; height: 32px;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .stat-icon.total,
    .stat-icon.upcoming { background: var(--primary-light); color: var(--primary); }
    .stat-icon.past     { background: #f0eded; color: var(--text-light); }
    .stat-icon svg { width: 14px; height: 14px; }

    .stat-info { display: flex; flex-direction: column; }
    .stat-number {
      font-family: 'Fraunces', serif;
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-dark);
      line-height: 1;
    }
    .stat-label {
      font-size: .7rem;
      color: var(--text-mid);
      font-weight: 500;
      margin-top: 1px;
    }
    .stat-divider { width: 1px; height: 28px; background: var(--border); }

    /* ─── EVENTS GRID ─── */
    .events-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 26px;
    }

    /* ─── CARD BASE ─── */
    .event-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(128,0,128,0.09);
      transition: transform .32s cubic-bezier(.34,1.4,.64,1), box-shadow .32s ease;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .event-card::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 20px;
      background: linear-gradient(135deg, rgba(128,0,128,0.04) 0%, transparent 60%);
      pointer-events: none;
      z-index: 0;
      opacity: 0;
      transition: opacity .3s ease;
    }
    .event-card:hover::before { opacity: 1; }
    .event-card:hover {
      box-shadow: 0 20px 48px rgba(128,0,128,0.18);
      transform: translateY(-6px);
    }
    .event-card:hover .card-image { transform: scale(1.07); }

    /* ─── IMAGE AREA ─── */
    .card-image-wrapper {
      position: relative;
      height: 220px;
      overflow: hidden;
      background: linear-gradient(135deg, var(--primary-mid) 0%, var(--primary-light) 100%);
    }
    .card-image {
      width: 100%; height: 100%;
      object-fit: cover;
      transition: transform .5s cubic-bezier(.25,.46,.45,.94);
    }
    .card-image-wrapper::after {
      content: '';
      position: absolute; inset: 0;
      background: linear-gradient(to top, rgba(46,21,46,.55) 0%, rgba(46,21,46,.1) 45%, transparent 70%);
      pointer-events: none;
    }

    /* Fallback when no image */
    .img-fallback {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--primary-light) 0%, var(--primary-mid) 100%);
    }
    .img-fallback svg {
      width: 80px; height: 80px;
      opacity: 0.8;
    }

    /* ─── STATUS BADGE (glassmorphism) ─── */
    .card-badge {
      position: absolute;
      top: 14px; left: 14px;
      z-index: 2;
      padding: 5px 14px;
      border-radius: 50px;
      font-size: .62rem;
      font-weight: 800;
      letter-spacing: .12em;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 6px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }
    .card-badge.upcoming {
      background: rgba(128,0,128,0.82);
      color: #fff;
      border: 1px solid rgba(255,255,255,0.28);
      box-shadow: 0 4px 14px rgba(128,0,128,0.35);
    }
    .card-badge.past {
      background: rgba(20,0,20,0.55);
      color: rgba(255,255,255,0.85);
      border: 1px solid rgba(255,255,255,0.15);
    }
    .badge-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: currentColor;
      animation: pulse-dot 1.8s ease-in-out infinite;
    }
    .card-badge.past .badge-dot { animation: none; opacity: 0.6; }
    @keyframes pulse-dot {
      0%,100% { opacity:1; transform: scale(1); }
      50% { opacity:.5; transform: scale(0.7); }
    }

    /* ─── FLOATING DATE CHIP ─── */
    .card-date-chip {
      position: absolute;
      bottom: 14px; right: 14px;
      z-index: 2;
      background: rgba(255,255,255,0.95);
      border-radius: 12px;
      padding: 6px 12px;
      text-align: center;
      border: 1px solid rgba(128,0,128,0.15);
      box-shadow: 0 4px 12px rgba(0,0,0,0.14);
      min-width: 48px;
      backdrop-filter: blur(8px);
    }

    .card-share-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 3;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: none;
      background: rgba(255,255,255,0.9);
      color: #800080;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      backdrop-filter: blur(6px);
      transition: all 0.2s;
      font-size: 0.875rem;
    }
    .card-share-btn:hover:not(:disabled) {
      color: #fff;
      transform: scale(1.1);
    }
    .card-share-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .chip-day {
      font-family: 'Fraunces', serif;
      font-size: 1.4rem;
      font-weight: 800;
      color: var(--primary);
      line-height: 1;
    }
    .chip-month {
      font-size: 0.58rem;
      font-weight: 800;
      letter-spacing: .1em;
      color: var(--text-mid);
      margin-top: 2px;
    }

    /* ─── CARD BODY ─── */
    .card-body {
      padding: 20px 22px 22px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      flex: 1;
      position: relative;
      z-index: 1;
    }

    /* ─── META ROW (time + location) ─── */
    .card-meta-row {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      align-items: center;
    }
    .meta-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.7rem;
      font-weight: 700;
      background: var(--primary-light);
      color: var(--primary-dark);
      border-radius: 50px;
      padding: 4px 11px;
      letter-spacing: 0.02em;
    }
    .meta-chip svg { width: 11px; height: 11px; flex-shrink: 0; }
    .location-chip { background: #f3f0ff; color: #5b21b6; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* ─── COUNTDOWN ─── */
    .countdown-pill {
      display: flex;
      align-items: center;
      gap: 7px;
      background: linear-gradient(135deg, #fdf2f8, #fce7f3);
      color: #9d174d;
      padding: 9px 14px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 0.8rem;
      border: 1px solid #fbcfe8;
    }
    .countdown-pill svg { width: 14px; height: 14px; flex-shrink: 0; }

    /* ─── TITLE ─── */
    .card-title {
      font-family: 'Fraunces', serif;
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--text-dark);
      margin: 0;
      line-height: 1.3;
      word-break: break-word;
      letter-spacing: -.02em;
    }

    /* ─── DESCRIPTION ─── */
    .card-description {
      font-size: .8rem;
      color: var(--text-mid);
      margin: 0;
      line-height: 1.65;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* ─── CAPACITY ─── */
    .capacity-section { display: flex; flex-direction: column; gap: 6px; }
    .capacity-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--text-mid);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .capacity-count {
      font-family: 'Fraunces', serif;
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--primary);
    }
    .capacity-bar {
      width: 100%;
      height: 5px;
      background: var(--primary-light);
      border-radius: 10px;
      overflow: hidden;
    }
    .capacity-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--primary) 0%, #c026d3 100%);
      border-radius: 10px;
      transition: width 0.6s cubic-bezier(.4,0,.2,1);
    }
    .capacity-fill.full { background: linear-gradient(90deg, #dc2626, #b91c1c); }

    /* ─── SEPARATOR ─── */
    .card-separator { height: 1px; background: var(--border); margin-top: auto; }

    /* ─── ACTIONS ROW ─── */
    .card-actions-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .card-remind {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: .68rem;
      font-weight: 700;
      color: var(--primary-dark);
      background: var(--primary-light);
      padding: 5px 12px;
      border-radius: 50px;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .card-remind svg { width: 11px; height: 11px; }

    /* ─── PARTICIPATE BUTTON ─── */
    .btn-participate {
      flex: 1;
      background: linear-gradient(135deg, var(--primary) 0%, #a21caf 100%);
      color: white;
      border: none;
      border-radius: 12px;
      padding: 11px 20px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-weight: 800;
      font-size: 0.82rem;
      letter-spacing: 0.02em;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(.4,0,.2,1);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 14px rgba(128,0,128,0.28);
      position: relative;
      overflow: hidden;
    }
    .btn-participate::before {
      content: '';
      position: absolute; inset: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 100%);
      opacity: 0;
      transition: opacity .2s ease;
    }
    .btn-participate:hover:not(:disabled)::before { opacity: 1; }
    .btn-participate:hover:not(:disabled) {
      transform: translateY(-2px) scale(1.01);
      box-shadow: 0 8px 22px rgba(128,0,128,0.38);
    }
    .btn-participate:active:not(:disabled) { transform: translateY(0) scale(0.99); }
    .btn-participate:disabled {
      background: #e2e2e2;
      color: #9ca3af;
      cursor: not-allowed;
      box-shadow: none;
    }

    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-top: 44px;
    }

    .page-btn {
      min-width: 40px; height: 40px;
      padding: 0 12px;
      border-radius: 12px;
      border: 1.5px solid var(--border);
      background: var(--white);
      color: var(--text-mid);
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: .875rem;
      font-weight: 600;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all .18s;
      box-shadow: var(--shadow);
    }
    .page-btn svg { width: 16px; height: 16px; }
    .page-btn:hover:not(:disabled) {
      border-color: var(--primary);
      color: var(--primary);
      transform: translateY(-1px);
    }
    .page-btn.active {
      background: var(--primary);
      border-color: var(--primary);
      color: var(--white);
      font-weight: 700;
    }
    .page-btn:disabled { opacity: .4; cursor: not-allowed; }

    .empty-state {
      display: flex; flex-direction: column;
      align-items: center;
      padding: 90px 20px;
      gap: 14px;
      text-align: center;
    }
    .empty-glass {
      width: 120px; height: 120px;
      border-radius: 30px;
      background: var(--primary-light);
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 8px;
    }
    .empty-glass svg { width: 52px; height: 52px; color: var(--primary); }
    .empty-title {
      font-family: 'Fraunces', serif;
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--text-dark);
      margin: 0;
    }
    .empty-sub { font-size: .88rem; color: var(--text-light); margin: 0; }

    @media (max-width: 1100px) {
      .events-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 900px) {
      .controls-row {
        flex-direction: column;
        align-items: center;
        gap: 15px;
        min-height: auto;
      }
      .search-box {
        position: relative;
        left: 0;
        transform: none;
        max-width: 100%;
      }
      .search-box:focus-within { transform: translateY(-2px); }
    }
    @media (max-width: 640px) {
      .events-page { padding: 24px 18px 56px; }
      .page-title  { font-size: 2rem; }
      .events-grid { grid-template-columns: 1fr; }
      .header-right { width: 100%; }
      .search-input { width: 100%; }
    }

    /* ─── SHARE MODAL ─── */
    .evt-modal-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.45);
      backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      z-index: 9999;
      animation: fadeIn .2s ease;
    }
    .evt-modal-container {
      background: #fff;
      border-radius: 20px;
      width: 90%; max-width: 520px;
      max-height: 85vh;
      display: flex; flex-direction: column;
      box-shadow: 0 20px 60px rgba(128,0,128,.2);
      overflow: hidden;
      animation: slideUp .25s cubic-bezier(.16,1,.3,1);
    }
    .evt-modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #f0e0f0;
      flex-shrink: 0;
    }
    .evt-modal-close {
      width: 32px; height: 32px; border-radius: 50%;
      border: none; background: #f5e6f5; color: #800080;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all .15s;
    }
    .evt-modal-close:hover { background: #800080; color: #fff; }
    .evt-modal-body { padding: 1.25rem 1.5rem; overflow-y: auto; flex: 1; }

    .evt-caption-input {
      width: 100%; border: 1px solid #e0c8e0; border-radius: 12px;
      padding: .75rem 1rem; font-size: .9rem; resize: none; outline: none;
      margin-bottom: 1rem; font-family: inherit; color: #2e152e;
      background: #fdf5fd;
    }
    .evt-caption-input:focus { border-color: #800080; }

    .evt-destination-section { display: flex; flex-direction: column; gap: .75rem; }
    .evt-dest-label { font-size: .78rem; font-weight: 700; color: #b07ab0; text-transform: uppercase; letter-spacing: .5px; margin: 0; }
    .evt-global-item { border: 2px solid #e0c8e0; }
    .evt-global-item:hover { border-color: #800080; background: #fdf5fd; }
    .evt-global-avatar {
      width: 40px; height: 40px; border-radius: 10px;
      background: linear-gradient(135deg, #800080, #9933cc);
      color: #fff; font-size: 1rem;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }

    .evt-divider {
      display: flex; align-items: center; gap: .75rem;
      color: #b07ab0; font-size: .75rem; font-weight: 600;
    }
    .evt-divider::before, .evt-divider::after {
      content: ''; flex: 1; height: 1px; background: #e0c8e0;
    }

    .evt-share-preview {
      background: linear-gradient(135deg, #f5e6f5, #fdf5fd);
      border: 1px solid #e0c8e0;
      border-radius: 12px;
      padding: 1rem 1.25rem;
      margin-bottom: 1rem;
    }
    .evt-preview-badge {
      display: inline-flex;
      align-items: center;
      border-radius: 50px;
      padding: 3px 10px;
      font-size: .7rem;
      font-weight: 700;
      margin-bottom: .5rem;
    }
    .evt-preview-title {
      font-weight: 700;
      font-size: .95rem;
      color: #2e152e;
      margin: 0 0 .25rem;
    }
    .evt-preview-meta { font-size: .78rem; color: #6b3e6b; margin: 0; }
    .evt-search-wrap {
      display: flex;
      align-items: center;
      gap: .5rem;
      background: #f5e6f5;
      border-radius: 50px;
      padding: .5rem 1rem;
      margin-bottom: 1rem;
    }
    .evt-search-wrap i { color: #b07ab0; font-size: .85rem; }
    .evt-search-input {
      border: none;
      background: transparent;
      flex: 1;
      font-size: .875rem;
      outline: none;
      color: #2e152e;
    }
    .evt-search-input::placeholder { color: #b07ab0; }
    .evt-groups-list { display: flex; flex-direction: column; gap: .5rem; }
    .evt-empty { text-align: center; padding: 2rem; color: #b07ab0; font-size: .85rem; }
    .evt-group-item {
      display: flex;
      align-items: center;
      gap: .75rem;
      padding: .75rem 1rem;
      border: 1px solid #f0e0f0;
      border-radius: 12px;
      cursor: pointer;
      transition: all .15s;
    }
    .evt-group-item:hover { background: #fdf5fd; border-color: #e0c8e0; }
    .evt-group-avatar {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      color: #fff;
      font-weight: 700;
      font-size: .8rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .evt-group-info { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .evt-group-name { font-weight: 700; font-size: .875rem; color: #2e152e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .evt-group-sub { font-size: .72rem; color: #b07ab0; }
    .evt-share-btn {
      flex-shrink: 0;
      padding: .375rem .875rem;
      border-radius: 50px;
      border: none;
      background: #800080;
      color: #fff;
      font-size: .78rem;
      font-weight: 700;
      cursor: pointer;
      transition: all .15s;
      display: flex;
      align-items: center;
      gap: .375rem;
    }
    .evt-share-btn:hover:not(:disabled) { background: #660066; }
    .evt-share-btn:disabled { opacity: .5; cursor: not-allowed; }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px) scale(.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes fadeIn {
      from { opacity: 0; } to { opacity: 1; }
    }
  `]
})
export class EventFrontComponent implements OnInit {

  events: CalendarEvent[] = [];
  searchQuery = '';
  currentPage = 1;
  pageSize = 6;

  showBooking = false;
  selectedEvent: CalendarEvent | null = null;
  todayDateStr: string = '';

  //Share 
  isSharing = signal<boolean>(false);
  successMessage = signal<string>('');
  errorMessage = signal<string>('');

  showShareModal = signal<boolean>(false);
  sharingEvent = signal<CalendarEvent | null>(null);
  shareSearchQuery = signal<string>('');
  shareCaption = '';

  private publicationService = inject(PublicationService);
  private messageService = inject(MessageService);
  private chatGroupService = inject(ChatGroupService);
  private authService = inject(AuthService);

  filteredGroups = computed(() => {
    const q = this.shareSearchQuery().toLowerCase();
    const userId = this.authService.getCurrentUser()?.id;
    return this.chatGroupService.groups().filter(g =>
      (!q || g.name.toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q)) &&
      g.members.some(m => m.id === userId)
    );
  });

  constructor(private eventService: EventService) {}

  ngOnInit() { 
    this.updateTodayDate();
    this.load(); 
    // Mise à jour de la date chaque minute pour s'assurer qu'elle reste correcte
    setInterval(() => this.updateTodayDate(), 60000);
  }

  updateTodayDate() {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    this.todayDateStr = new Date().toLocaleDateString('en-US', options);
  }

  load() {
    this.eventService.getAll().subscribe((data: CalendarEvent[]) => {
      this.events = data;
      this.currentPage = 1;
    });
  }

  get filteredEvents(): CalendarEvent[] {
    if (!this.searchQuery.trim()) return this.events;
    const q = this.searchQuery.toLowerCase();
    return this.events.filter(e =>
      e.title?.toLowerCase().includes(q) ||
      e.location?.toLowerCase().includes(q) ||
      e.description?.toLowerCase().includes(q)
    );
  }

  get totalPages(): number { return Math.ceil(this.filteredEvents.length / this.pageSize); }
  get pageNumbers(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }
  get pagedEvents(): CalendarEvent[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredEvents.slice(start, start + this.pageSize);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onSearchChange() { this.currentPage = 1; }

  getImageUrl(imageUrl?: string): string {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http')) return imageUrl;
    return 'http://localhost:8080' + imageUrl;
  }

  getDay(dateStr?: string): string {
    if (!dateStr) return '--';
    return new Date(dateStr).getDate().toString().padStart(2, '0');
  }

  getMonth(dateStr?: string): string {
    if (!dateStr) return '';
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    return months[new Date(dateStr).getMonth()];
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatTime(dateStr?: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  isUpcoming(dateStr?: string): boolean {
    if (!dateStr) return false;
    return new Date(dateStr) > new Date();
  }

  getTimeRemainingText(dateStr?: string): string {
    if (!dateStr) return '';
    const eventDate = new Date(dateStr);
    const now = new Date();
    
    if (eventDate <= now) {
      return 'The event has already passed';
    }

    const diffMs = eventDate.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays === 0) {
      if (diffHours === 0) return 'Very soon (less than an hour)';
      return `Today, in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else if (diffDays === 1) {
      return `Tomorrow, in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else {
      return `In ${diffDays} day${diffDays > 1 ? 's' : ''} and ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    }
  }

  getUpcomingCount(): number {
    return this.events.filter(e => this.isUpcoming(e.startDateTime)).length;
  }

  openBooking(event: CalendarEvent) {
    this.selectedEvent = event;
    this.showBooking = true;
  }

  onBookingClosed() {
    this.showBooking = false;
    this.selectedEvent = null;
    this.load(); // Rafraîchir pour voir les places dispo (si affichées un jour sur la card)
  }

  onImgError(evt: any) {
    // Inline SVG fallback — no missing file dependency
    evt.target.style.display = 'none';
    const wrapper = evt.target.closest('.card-image-wrapper');
    if (wrapper && !wrapper.querySelector('.img-fallback')) {
      const fallback = document.createElement('div');
      fallback.className = 'img-fallback';
      fallback.innerHTML = `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="80" height="80" rx="16" fill="#f5e6f5"/>
        <rect x="20" y="16" width="40" height="40" rx="4" stroke="#800080" stroke-width="2.5" fill="none"/>
        <line x1="30" y1="12" x2="30" y2="23" stroke="#800080" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="50" y1="12" x2="50" y2="23" stroke="#800080" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="20" y1="32" x2="60" y2="32" stroke="#800080" stroke-width="2" opacity="0.4"/>
        <circle cx="40" cy="52" r="8" fill="#800080" opacity="0.15"/>
        <text x="40" y="57" text-anchor="middle" fill="#800080" font-size="10" font-weight="700">EVENT</text>
      </svg>`;
      wrapper.appendChild(fallback);
    }
  }

  shareEvent(event: CalendarEvent) {
    if (!this.authService.isLoggedIn()) {
      this.errorMessage.set('Please log in to share an event.');
      setTimeout(() => this.errorMessage.set(''), 3000);
      return;
    }
    this.sharingEvent.set(event);
    this.showShareModal.set(true);
    this.chatGroupService.fetchGroups();
  }

  closeShareModal() {
    this.showShareModal.set(false);
    this.sharingEvent.set(null);
    this.shareSearchQuery.set('');
    this.shareCaption = '';
  }

  shareEventGlobal() {
    const event = this.sharingEvent();
    const userId = this.authService.getCurrentUser()?.id;
    if (!event || !userId) return;
    this.isSharing.set(true);
    const content = this.shareCaption.trim() || `Check out this event: ${event.title}`;
    this.publicationService.createPublicationJson({
      type: 'EVENT',
      content,
      authorId: userId,
      linkedEventId: event.id
    }).subscribe({
      next: () => {
        this.isSharing.set(false);
        this.closeShareModal();
        this.successMessage.set('Event shared on the community feed!');
        setTimeout(() => this.successMessage.set(''), 4000);
      },
      error: (err) => {
        this.isSharing.set(false);
        this.errorMessage.set('Error: ' + (err.error?.message || 'Please try again later.'));
        setTimeout(() => this.errorMessage.set(''), 4000);
      }
    });
  }

  shareEventToGroup(groupId: string) {
    const event = this.sharingEvent();
    const userId = this.authService.getCurrentUser()?.id;
    if (!event || !userId) return;
    this.isSharing.set(true);
    const content = this.shareCaption.trim() || `Check out this event: ${event.title}`;
    this.publicationService.createPublicationJson({
      type: 'EVENT',
      content,
      authorId: userId,
      linkedEventId: event.id,
      groupId
    }).subscribe({
      next: () => {
        this.isSharing.set(false);
        this.closeShareModal();
        this.chatGroupService.fetchGroups(); // Refresh groups to update membership
        this.successMessage.set('Event shared successfully!');
        setTimeout(() => this.successMessage.set(''), 4000);
      },
      error: (err) => {
        this.isSharing.set(false);
        this.errorMessage.set('Error: ' + (err.error?.message || 'Please try again later.'));
        setTimeout(() => this.errorMessage.set(''), 4000);
      }
    });
  }
}

