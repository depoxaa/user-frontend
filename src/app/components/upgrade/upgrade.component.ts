import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, PaymentService, UserService } from '../../services';
import { SubscriptionDto } from '../../services/user.service';

@Component({
  selector: 'app-upgrade',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="upgrade-page">
      <div class="upgrade-container">
        <button class="back-btn" (click)="goBack()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div class="hero">
          <h1>Upgrade to Premium</h1>
          <p class="subtitle">Unlock the full Aganim experience</p>
        </div>

        @if (subscription()?.tier === 'Premium') {
          <div class="already-premium">
            <div class="premium-badge">Premium</div>
            <p>You're already a Premium member! Enjoy all the benefits.</p>
          </div>
        } @else {
          <div class="pricing-card">
            <div class="price">
              <span class="amount">\${{ premiumPrice().toFixed(2) }}</span>
              <span class="period">/month</span>
            </div>

            <ul class="features">
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                Up to 50 playlists (vs 5 for free)
              </li>
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                Up to 500 live stream viewers (vs 10 for free)
              </li>
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                Priority support
              </li>
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                Premium badge on your profile
              </li>
            </ul>

            @if (error()) {
              <div class="error">{{ error() }}</div>
            }
            @if (success()) {
              <div class="success">{{ success() }}</div>
            }

            <button class="upgrade-btn" [disabled]="upgrading()" (click)="upgrade()">
              @if (upgrading()) {
                Processing...
              } @else {
                Pay with Google Pay
              }
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .upgrade-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 24px;
    }
    .upgrade-container { max-width: 480px; width: 100%; }
    .back-btn {
      display: flex; align-items: center; gap: 8px;
      background: none; border: none; color: rgba(255,255,255,0.7);
      cursor: pointer; margin-bottom: 24px; font-size: 14px;
    }
    .back-btn:hover { color: #fff; }
    .hero { text-align: center; margin-bottom: 32px; }
    .hero h1 { color: #fff; font-size: 32px; margin: 0 0 8px; }
    .subtitle { color: rgba(255,255,255,0.6); font-size: 16px; }
    .pricing-card {
      background: rgba(255,255,255,0.1);
      border-radius: 16px; padding: 32px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.15);
    }
    .price { text-align: center; margin-bottom: 28px; }
    .amount { font-size: 48px; font-weight: 700; color: #fff; }
    .period { color: rgba(255,255,255,0.5); font-size: 18px; }
    .features { list-style: none; padding: 0; margin: 0 0 28px; display: flex; flex-direction: column; gap: 14px; }
    .features li {
      display: flex; align-items: center; gap: 12px;
      color: rgba(255,255,255,0.8); font-size: 15px;
    }
    .upgrade-btn {
      width: 100%; padding: 14px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff; border: none; border-radius: 10px;
      font-size: 16px; font-weight: 600; cursor: pointer;
    }
    .upgrade-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .upgrade-btn:hover:not(:disabled) { opacity: 0.9; }
    .already-premium {
      background: rgba(255,255,255,0.1); border-radius: 16px; padding: 32px;
      text-align: center;
    }
    .premium-badge {
      display: inline-block; padding: 8px 24px;
      background: linear-gradient(135deg, #f59e0b, #ef4444);
      color: #fff; border-radius: 20px; font-weight: 700;
      font-size: 18px; margin-bottom: 12px;
    }
    .already-premium p { color: rgba(255,255,255,0.7); }
    .error { color: #fca5a5; background: rgba(239,68,68,0.2); padding: 12px; border-radius: 8px; margin-bottom: 16px; }
    .success { color: #86efac; background: rgba(34,197,94,0.2); padding: 12px; border-radius: 8px; margin-bottom: 16px; }
  `]
})
export class UpgradeComponent implements OnInit {
  subscription = signal<SubscriptionDto | null>(null);
  premiumPrice = signal(9.99);
  upgrading = signal(false);
  error = signal('');
  success = signal('');

  constructor(
    private paymentService: PaymentService,
    private userService: UserService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userService.getSubscription().subscribe({
      next: (sub) => this.subscription.set(sub)
    });
    this.userService.getPremiumPrice().subscribe({
      next: (price) => this.premiumPrice.set(price)
    });
  }

  upgrade(): void {
    this.upgrading.set(true);
    this.error.set('');

    this.paymentService.upgradeWithGooglePay(this.premiumPrice()).subscribe({
      next: () => {
        this.upgrading.set(false);
        this.success.set('Welcome to Premium! Enjoy your upgraded experience.');
        // Refresh subscription status
        this.userService.getSubscription().subscribe({
          next: (sub) => this.subscription.set(sub)
        });
      },
      error: (err) => {
        this.upgrading.set(false);
        if (err?.message !== 'User closed the payment sheet') {
          this.error.set(err?.error?.error || 'Payment failed. Please try again.');
        }
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
