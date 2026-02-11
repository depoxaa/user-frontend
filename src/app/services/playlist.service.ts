import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Playlist, PlaylistDetail, CreatePlaylistRequest, UpdatePlaylistRequest } from '../models';

@Injectable({
  providedIn: 'root'
})
export class PlaylistService {
  constructor(private api: ApiService) {}

  getById(id: string): Observable<PlaylistDetail> {
    return this.api.get<PlaylistDetail>(`/playlists/${id}`);
  }

  getByUser(userId: string): Observable<Playlist[]> {
    return this.api.get<Playlist[]>(`/playlists/user/${userId}`);
  }

  getMyPlaylists(): Observable<Playlist[]> {
    return this.api.get<Playlist[]>('/playlists/my');
  }

  getPublicPlaylists(take: number = 20): Observable<Playlist[]> {
    return this.api.get<Playlist[]>(`/playlists/public?take=${take}`);
  }

  search(query: string): Observable<Playlist[]> {
    return this.api.get<Playlist[]>(`/playlists/search?query=${encodeURIComponent(query)}`);
  }

  create(data: CreatePlaylistRequest): Observable<Playlist> {
    return this.api.post<Playlist>('/playlists', data);
  }

  update(id: string, data: UpdatePlaylistRequest): Observable<Playlist> {
    return this.api.put<Playlist>(`/playlists/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/playlists/${id}`);
  }

  addSong(playlistId: string, songId: string): Observable<void> {
    return this.api.post<void>(`/playlists/${playlistId}/songs`, { songId });
  }

  removeSong(playlistId: string, songId: string): Observable<void> {
    return this.api.delete<void>(`/playlists/${playlistId}/songs/${songId}`);
  }

  reorderSongs(playlistId: string, songIds: string[]): Observable<void> {
    return this.api.put<void>(`/playlists/${playlistId}/songs/reorder`, songIds);
  }

  uploadCover(playlistId: string, file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.postFormData<string>(`/playlists/${playlistId}/cover`, formData);
  }
}
