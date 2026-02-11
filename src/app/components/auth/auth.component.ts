import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services';

type AuthMode = 'login' | 'register' | 'confirm';
type UserType = 'user' | 'artist';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss'
})
export class AuthComponent {
  mode = signal<AuthMode>('login');
  userType = signal<UserType>('user');
  loading = signal<boolean>(false);
  error = signal<string>('');
  success = signal<string>('');
  pendingEmail = signal<string>('');

  // Form data
  username = '';
  email = '';
  password = '';
  confirmPassword = '';
  bio = '';
  confirmationCode = '';
  submitted = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  setMode(mode: AuthMode): void {
    this.mode.set(mode);
    this.error.set('');
    this.success.set('');
    this.submitted = false;
    if (mode !== 'confirm') {
      this.clearForm();
    }
  }

  setUserType(type: UserType): void {
    this.userType.set(type);
    this.error.set('');
    this.success.set('');
    this.clearForm();
  }

  clearForm(): void {
    this.username = '';
    this.email = '';
    this.password = '';
    this.confirmPassword = '';
    this.bio = '';
    this.confirmationCode = '';
    this.submitted = false;
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  onSubmit(): void {
    this.error.set('');
    this.success.set('');
    this.submitted = true;

    if (this.mode() === 'confirm') {
      this.handleConfirmation();
      return;
    }

    if (!this.validateForm()) return;

    this.loading.set(true);

    if (this.mode() === 'login') {
      this.handleLogin();
    } else {
      this.handleRegister();
    }
  }

  private validateForm(): boolean {
    if (this.mode() === 'login') {
      if (!this.username || !this.password) {
        this.error.set('Please fill in all fields');
        return false;
      }
    } else {
      if (!this.username || !this.email || !this.password || !this.confirmPassword) {
        this.error.set('Please fill in all required fields');
        return false;
      }
      if (this.password !== this.confirmPassword) {
        this.error.set('Passwords do not match');
        return false;
      }
      if (this.password.length < 6) {
        this.error.set('Password must be at least 6 characters');
        return false;
      }
      if (!this.email.includes('@')) {
        this.error.set('Please enter a valid email');
        return false;
      }
    }
    return true;
  }

  private handleLogin(): void {
    if (this.userType() === 'user') {
      this.authService.loginUser({ username: this.username, password: this.password })
        .subscribe({
          next: () => {
            this.loading.set(false);
            this.router.navigate(['/']);
          },
          error: (err) => {
            this.loading.set(false);
            this.error.set(err?.error?.message || 'Login failed. Please check your credentials.');
          }
        });
    } else {
      // Artists login with email
      this.authService.loginArtist({ username: this.username, password: this.password })
        .subscribe({
          next: () => {
            this.loading.set(false);
            this.router.navigate(['/artist-dashboard']);
          },
          error: (err) => {
            this.loading.set(false);
            this.error.set(err?.error?.message || 'Login failed. Please check your credentials.');
          }
        });
    }
  }

  private handleRegister(): void {
    if (this.userType() === 'user') {
      this.authService.registerUser({
        username: this.username,
        email: this.email,
        password: this.password,
        confirmPassword: this.confirmPassword
      }).subscribe({
        next: () => {
          this.loading.set(false);
          this.pendingEmail.set(this.email);
          this.mode.set('confirm');
          this.success.set('Registration successful! Please check your email for a confirmation code.');
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || 'Registration failed');
        }
      });
    } else {
      this.authService.registerArtist({
        name: this.username,
        email: this.email,
        password: this.password,
        confirmPassword: this.confirmPassword,
        bio: this.bio || undefined
      }).subscribe({
        next: () => {
          this.loading.set(false);
          this.pendingEmail.set(this.email);
          this.mode.set('confirm');
          this.success.set('Registration successful! Please check your email for a confirmation code.');
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || 'Registration failed');
        }
      });
    }
  }

  private handleConfirmation(): void {
    if (!this.confirmationCode) {
      this.error.set('Please enter the confirmation code');
      return;
    }

    this.loading.set(true);

    const confirmMethod = this.userType() === 'user'
      ? this.authService.confirmEmail.bind(this.authService)
      : this.authService.confirmArtistEmail.bind(this.authService);

    confirmMethod({ email: this.pendingEmail(), code: this.confirmationCode })
      .subscribe({
        next: () => {
          this.loading.set(false);
          // Check if already authenticated (token from registration)
          if (this.authService.isAuthenticated()) {
            // Navigate directly to home/dashboard
            const route = this.userType() === 'user' ? '/' : '/artist-dashboard';
            this.router.navigate([route]);
          } else {
            this.success.set('Email confirmed successfully! You can now log in.');
            // Clear confirmation code and switch to login mode
            this.confirmationCode = '';
            // Pre-fill the username field for convenience
            if (this.userType() === 'user') {
              // For users, keep the username from registration
            } else {
              // For artists, set username to email since they login with email
              this.username = this.pendingEmail();
            }
            this.password = '';
            this.mode.set('login');
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || 'Confirmation failed');
        }
      });
  }

  resendCode(): void {
    if (!this.pendingEmail()) return;

    this.loading.set(true);
    this.authService.resendConfirmation(this.pendingEmail())
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.success.set('Confirmation code sent! Please check your email.');
          this.error.set('');
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || 'Failed to resend code');
        }
      });
  }
}
