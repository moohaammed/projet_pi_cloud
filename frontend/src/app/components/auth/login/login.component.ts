import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html'
})
export class LoginComponent implements AfterViewInit {

  @ViewChild('recaptchaContainer') recaptchaContainer!: ElementRef;

  credentials = { email: '', password: '' };
  loading = false;
  error = '';
  success = '';
  showPassword = false;

  view: 'login' | 'forgot' = 'login';
  captchaResolved = false;

  constructor(private authService: AuthService, private router: Router) {
    (window as any)['onRecaptchaSuccessLogin'] = (token: string) => {
      this.captchaResolved = true;
    };
    (window as any)['handleGoogleCredential'] = (response: any) => {
      this.handleGoogleCredential(response);
    };
  }

  ngAfterViewInit() {
    this.renderRecaptcha();
    this.renderGoogleButton();
  }

  renderRecaptcha() {
    const w = window as any;
    if (w.grecaptcha && w.grecaptcha.render) {
      setTimeout(() => {
        if (this.recaptchaContainer) {
          w.grecaptcha.render(this.recaptchaContainer.nativeElement, {
            sitekey: '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI',
            callback: 'onRecaptchaSuccessLogin'
          });
        }
      }, 500);
    } else {
      setTimeout(() => this.renderRecaptcha(), 500);
    }
  }

  renderGoogleButton() {
    const w = window as any;
    if (w.google && w.google.accounts) {
      w.google.accounts.id.initialize({
        // REMPLACEZ PAR VOTRE CLIENT ID GOOGLE CLOUD
        client_id: '859882848514-b1rd53iin3f5g9ss3m1o3v51n13u0evn.apps.googleusercontent.com',
        callback: (response: any) => this.handleGoogleCredential(response)
      });
      const btnContainer = document.getElementById("googleBtnContainer");
      if (btnContainer) {
        w.google.accounts.id.renderButton(
          btnContainer,
          { theme: "outline", size: "large", text: "signin_with", shape: "rectangular" }
        );
      }
    } else {
      setTimeout(() => this.renderGoogleButton(), 500);
    }
  }

  login(): void {
    if (!this.credentials.email || !this.credentials.password) {
      this.error = 'Veuillez remplir tous les champs';
      return;
    }
    if (!this.captchaResolved) {
      this.error = 'Veuillez valider le reCAPTCHA google';
      return;
    }

    this.loading = true;
    this.error = '';
    this.authService.login(this.credentials).subscribe({
      next: () => {
        this.loading = false;
        this.authService.redirectByRole();
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err.status === 0
          ? 'Serveur inaccessible'
          : (err.error?.message || err.error || 'Email ou mot de passe incorrect');
      }
    });
  }

  handleGoogleCredential(response: any): void {
    if (!response.credential) return;
    this.loading = true;
    // On envoie le token reçu par Google au backend
    this.authService.loginWithGoogle(response.credential).subscribe({
      next: () => {
        this.loading = false;
        this.authService.redirectByRole();
      },
      error: (err: any) => {
        this.loading = false;
        console.error(err);
        this.error = 'Échec de la connexion avec Google. ' + (err.error?.message || '');
      }
    });
  }

  // --- MOT DE PASSE OUBLIÉ ---
  showForgotForm(): void {
    this.view = 'forgot';
    this.error = '';
    this.success = '';
  }

  backToLogin(): void {
    this.view = 'login';
    this.error = '';
    this.success = '';
  }

  requestReset(): void {
    if (!this.credentials.email) {
      this.error = 'Veuillez spécifier votre adresse email.';
      return;
    }
    this.loading = true;
    this.error = '';
    this.success = '';
    this.authService.resetPassword(this.credentials.email).subscribe({
      next: (res) => {
        this.loading = false;
        this.success = res.message || 'Lien de réinitialisation envoyé par email avec succès.';
        setTimeout(() => { if (this.view === 'forgot') this.backToLogin() }, 4000);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || err.message || 'Erreur lors de la réinitialisation.';
      }
    });
  }

  togglePassword(): void { this.showPassword = !this.showPassword; }
}