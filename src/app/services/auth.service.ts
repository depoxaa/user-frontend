import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, forkJoin } from 'rxjs';
import { ApiService } from './api.service';
import {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ConfirmEmailRequest,
  Artist,
  ArtistRegisterRequest,
  ArtistAuthResponse
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser = signal<User | null>(null);
  private currentArtist = signal<Artist | null>(null);
  private isAuthenticatedSignal = signal<boolean>(false);
  private userTypeSignal = signal<'user' | 'artist' | null>(null);

  user = computed(() => this.currentUser());
  artist = computed(() => this.currentArtist());
  isAuthenticated = computed(() => this.isAuthenticatedSignal());
  userType = computed(() => this.userTypeSignal());

  constructor(
    private api: ApiService,
    private router: Router
  ) {
    this.loadStoredAuth();
  }

  private loadStoredAuth(): void {
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType') as 'user' | 'artist' | null;
    const storedData = localStorage.getItem('userData');

    if (token && userType && storedData) {
      this.userTypeSignal.set(userType);
      this.isAuthenticatedSignal.set(true);

      const data = JSON.parse(storedData);
      if (userType === 'user') {
        this.currentUser.set(data);
      } else {
        this.currentArtist.set(data);
      }
    }
  }

  // User Authentication
  registerUser(data: RegisterRequest): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/register', data).pipe(
      tap(response => this.handleUserAuth(response)),
      catchError(error => throwError(() => error))
    );
  }

  loginUser(data: LoginRequest): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/login', data).pipe(
      tap(response => this.handleUserAuth(response)),
      catchError(error => throwError(() => error))
    );
  }

  confirmEmail(data: ConfirmEmailRequest): Observable<void> {
    return this.api.post<void>('/auth/confirm-email', data);
  }

  resendConfirmation(email: string): Observable<void> {
    return this.api.post<void>('/auth/resend-confirmation', email);
  }

  // Artist Authentication
  registerArtist(data: ArtistRegisterRequest): Observable<ArtistAuthResponse> {
    return this.api.post<ArtistAuthResponse>('/auth/artist/register', data).pipe(
      tap(response => this.handleArtistAuth(response)),
      catchError(error => throwError(() => error))
    );
  }

  loginArtist(data: LoginRequest): Observable<ArtistAuthResponse> {
    return this.api.post<ArtistAuthResponse>('/auth/artist/login', data).pipe(
      tap(response => this.handleArtistAuth(response)),
      catchError(error => throwError(() => error))
    );
  }

  confirmArtistEmail(data: ConfirmEmailRequest): Observable<void> {
    return this.api.post<void>('/auth/artist/confirm-email', data);
  }

  // Logout
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    localStorage.removeItem('userData');
    this.currentUser.set(null);
    this.currentArtist.set(null);
    this.isAuthenticatedSignal.set(false);
    this.userTypeSignal.set(null);
    this.router.navigate(['/auth']);
  }

  // Update user data
  updateUser(user: User): void {
    this.currentUser.set(user);
    localStorage.setItem('userData', JSON.stringify(user));
  }

  updateArtist(artist: Artist): void {
    this.currentArtist.set(artist);
    localStorage.setItem('userData', JSON.stringify(artist));
  }

  private handleUserAuth(response: AuthResponse): void {
    localStorage.setItem('token', response.token);
    localStorage.setItem('userType', 'user');
    localStorage.setItem('userData', JSON.stringify(response.user));
    this.currentUser.set(response.user);
    this.isAuthenticatedSignal.set(true);
    this.userTypeSignal.set('user');
  }

  private handleArtistAuth(response: ArtistAuthResponse): void {
    localStorage.setItem('token', response.token);
    localStorage.setItem('userType', 'artist');
    localStorage.setItem('userData', JSON.stringify(response.artist));
    this.currentArtist.set(response.artist);
    this.isAuthenticatedSignal.set(true);
    this.userTypeSignal.set('artist');
  }
}
