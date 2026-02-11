import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services';

// Auth Guard
const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (authService.isAuthenticated()) {
    return true;
  }
  
  return router.parseUrl('/auth');
};

// Artist Guard
const artistGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (authService.isAuthenticated() && authService.userType() === 'artist') {
    return true;
  }
  
  return router.parseUrl('/auth');
};

// User Guard
const userGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (authService.isAuthenticated() && authService.userType() === 'user') {
    return true;
  }
  
  return router.parseUrl('/auth');
};

// Guest Guard (redirect if already authenticated)
const guestGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (!authService.isAuthenticated()) {
    return true;
  }
  
  if (authService.userType() === 'artist') {
    return router.parseUrl('/artist-dashboard');
  }
  
  return router.parseUrl('/');
};

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/music-player/music-player.component').then(m => m.MusicPlayerComponent),
    canActivate: [userGuard]
  },
  {
    path: 'auth',
    loadComponent: () => import('./components/auth/auth.component').then(m => m.AuthComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'artist-dashboard',
    loadComponent: () => import('./components/artist-admin/artist-admin.component').then(m => m.ArtistAdminComponent),
    canActivate: [artistGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
