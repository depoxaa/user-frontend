import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { User, UpdateUserRequest, ChangePasswordRequest } from '../models';

export interface LivePlayback {
  userId: string;
  username: string;
  isLive: boolean;
  songId?: string;
  songTitle?: string;
  songArtist?: string;
  songCoverArt?: string;
  position: number;
  updatedAt?: string;
  isPaused: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(private api: ApiService) { }

  getCurrentUser(): Observable<User> {
    return this.api.get<User>('/users/me');
  }

  getUserById(id: string): Observable<User> {
    return this.api.get<User>(`/users/${id}`);
  }

  searchUsers(query: string): Observable<User[]> {
    return this.api.get<User[]>(`/users/search?query=${encodeURIComponent(query)}`);
  }

  updateProfile(data: UpdateUserRequest): Observable<User> {
    return this.api.put<User>('/users/me', data);
  }

  changePassword(data: ChangePasswordRequest): Observable<void> {
    return this.api.put<void>('/users/me/password', data);
  }

  updateAvatar(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.postFormData<string>('/users/me/avatar', formData);
  }

  updateListeningStatus(status: string | null): Observable<void> {
    return this.api.post<void>('/users/me/status', { status });
  }

  setOnlineStatus(isOnline: boolean): Observable<void> {
    return this.api.post<void>('/users/me/online', isOnline);
  }

  updatePlayback(songId: string | null, position: number, isPaused: boolean): Observable<void> {
    return this.api.post<void>('/users/me/playback', { songId, position, isPaused });
  }

  getLivePlayback(userId: string): Observable<LivePlayback> {
    return this.api.get<LivePlayback>(`/users/${userId}/playback`);
  }
}

