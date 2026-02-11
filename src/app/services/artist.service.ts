import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Artist, UpdateArtistRequest, ArtistStats, LiveArtist, ChangePasswordRequest } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ArtistService {
  constructor(private api: ApiService) { }

  getById(id: string): Observable<Artist> {
    return this.api.get<Artist>(`/artists/${id}`);
  }

  getCurrentArtist(): Observable<Artist> {
    return this.api.get<Artist>('/artists/me');
  }

  getStats(): Observable<ArtistStats> {
    return this.api.get<ArtistStats>('/artists/me/stats');
  }

  getLiveArtists(): Observable<Artist[]> {
    return this.api.get<Artist[]>('/artists/live');
  }

  getTopArtists(take: number = 10): Observable<Artist[]> {
    return this.api.get<Artist[]>(`/artists/top?take=${take}`);
  }

  search(query: string): Observable<Artist[]> {
    return this.api.get<Artist[]>(`/artists/search?query=${encodeURIComponent(query)}`);
  }

  update(data: UpdateArtistRequest): Observable<Artist> {
    return this.api.put<Artist>('/artists/me', data);
  }

  changePassword(data: ChangePasswordRequest): Observable<void> {
    return this.api.put<void>('/artists/me/password', data);
  }

  updateProfileImage(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.postFormData<string>('/artists/me/profile-image', formData);
  }

  goLive(genre: string): Observable<void> {
    return this.api.post<void>('/artists/me/go-live', genre);
  }

  stopLive(): Observable<void> {
    return this.api.post<void>('/artists/me/stop-live', {});
  }

  toggleSubscription(artistId: string): Observable<boolean> {
    return this.api.post<boolean>(`/artists/${artistId}/subscribe`, {});
  }

  isSubscribed(artistId: string): Observable<boolean> {
    return this.api.get<boolean>(`/artists/${artistId}/is-subscribed`);
  }

  getSubscribedArtists(): Observable<Artist[]> {
    return this.api.get<Artist[]>('/artists/subscribed');
  }
}
