import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Song, CreateSongRequest, UpdateSongRequest } from '../models';

@Injectable({
  providedIn: 'root'
})
export class SongService {
  constructor(private api: ApiService) {}

  getById(id: string): Observable<Song> {
    return this.api.get<Song>(`/songs/${id}`);
  }

  getByArtist(artistId: string): Observable<Song[]> {
    return this.api.get<Song[]>(`/songs/artist/${artistId}`);
  }

  getArtistSongs(): Observable<Song[]> {
    return this.api.get<Song[]>('/songs/me');
  }

  getByAlbum(albumId: string): Observable<Song[]> {
    return this.api.get<Song[]>(`/songs/album/${albumId}`);
  }

  getByGenre(genreId: string): Observable<Song[]> {
    return this.api.get<Song[]>(`/songs/genre/${genreId}`);
  }

  search(query: string): Observable<Song[]> {
    return this.api.get<Song[]>(`/songs/search?query=${encodeURIComponent(query)}`);
  }

  getTopSongs(take: number = 10): Observable<Song[]> {
    return this.api.get<Song[]>(`/songs/top?take=${take}`);
  }

  getRecentSongs(take: number = 20): Observable<Song[]> {
    return this.api.get<Song[]>(`/songs/recent?take=${take}`);
  }

  getLikedSongs(): Observable<Song[]> {
    return this.api.get<Song[]>('/songs/liked');
  }

  toggleLike(songId: string): Observable<boolean> {
    return this.api.post<boolean>(`/songs/${songId}/like`, {});
  }

  recordPlay(songId: string, listeningSeconds: number): Observable<void> {
    return this.api.post<void>(`/songs/${songId}/play`, listeningSeconds);
  }

  create(data: CreateSongRequest, audioFile: File, coverFile?: File): Observable<Song> {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('genreId', data.genreId);
    if (data.releaseDate) {
      formData.append('releaseDate', data.releaseDate.toISOString());
    }
    if (data.albumId) {
      formData.append('albumId', data.albumId);
    }
    if (data.albumName) {
      formData.append('albumName', data.albumName);
    }
    formData.append('price', (data.price ?? 0).toString());
    formData.append('audioFile', audioFile);
    if (coverFile) {
      formData.append('coverFile', coverFile);
    }
    return this.api.postFormData<Song>('/songs', formData);
  }

  upload(data: CreateSongRequest, audioFile: File, coverFile?: File): Observable<Song> {
    return this.create(data, audioFile, coverFile);
  }

  update(id: string, data: UpdateSongRequest): Observable<Song> {
    return this.api.put<Song>(`/songs/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/songs/${id}`);
  }

  getStreamUrl(songId: string): string {
    return this.api.getStreamUrl(songId);
  }

  getPurchasedSongs(): Observable<Song[]> {
    return this.api.get<Song[]>('/songs/purchased');
  }
}
