import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AccessibilityService {
  private readonly STORAGE_KEY = 'alzcare_simple_mode';

  // Signals for state management (modern Angular approach)
  simplifiedMode = signal<boolean>(false);
  highContrast = signal<boolean>(false);

  constructor() {
    // Load state from localStorage
    const savedState = localStorage.getItem(this.STORAGE_KEY);
    if (savedState) {
      const state = JSON.parse(savedState);
      this.simplifiedMode.set(state.simplifiedMode || false);
      this.highContrast.set(state.highContrast || false);
    }

    // Persist changes
    effect(() => {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
        simplifiedMode: this.simplifiedMode(),
        highContrast: this.highContrast()
      }));
      this.applyTheme();
    });
  }

  toggleSimplifiedMode() {
    this.simplifiedMode.set(!this.simplifiedMode());
  }

  toggleHighContrast() {
    this.highContrast.set(!this.highContrast());
  }

  private applyTheme() {
    if (typeof document !== 'undefined') {
      const body = document.body;
      if (this.simplifiedMode()) {
        body.classList.add('simplified-mode');
      } else {
        body.classList.remove('simplified-mode');
      }

      if (this.highContrast()) {
        body.classList.add('high-contrast');
      } else {
        body.classList.remove('high-contrast');
      }
    }
  }
}
